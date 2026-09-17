// The single place an order is allowed to become "paid".
//
// Every path that could settle a payment — the Chapa webhook, and the customer
// landing back on /pay/[token]/complete — funnels through settlePaymentAttempt()
// so that:
//
//   1. Chapa is asked server-to-server whether the payment succeeded, and the
//      answer is checked against what we EXPECTED to be charged (amount,
//      currency, and the tx_ref we generated). A "success" for the wrong amount
//      is not a success.
//   2. The write is idempotent and atomic. Concurrent callers race on a
//      conditional UPDATE against payment_links; exactly one wins and is the
//      one that sends the confirmation email. This replaces a check-then-act
//      read of `usedAt` that let two concurrent requests both pass.
//   3. Collected money accumulates in transactions.amountPaid and is never
//      overwritten by the size of a later attempt.

import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { orders, transactions } from '$lib/server/db/schema';
import { verifyChapaTransaction } from '$lib/server/chapa';
import { markPaymentLinksUsed } from '$lib/server/paymentLinks';
import { getAdjustedOrderTotals } from '$lib/server/orderAdjustments';
import { getOrderTotal } from '$lib/server/orders';
import { sendPaymentConfirmation } from '$lib/server/notifications';
import type { DbLike } from '$lib/server/stock';

export type SettlementOutcome =
	| { status: 'paid'; orderId: number; fullySettled: boolean; alreadySettled: boolean }
	| { status: 'failed'; orderId: number | null; reason: string }
	// `retryable`: asking again later could change the answer (Chapa unreachable,
	// or not confirmed yet). The webhook turns that into a 5xx so Chapa retries;
	// a non-retryable pending (unknown ref, stale attempt, amount mismatch) is
	// acknowledged instead, since a retry would only repeat it.
	| { status: 'pending'; orderId: number | null; reason: string; retryable: boolean };

/** Money comparisons need a cent of slack for decimal/float round-tripping. */
const AMOUNT_TOLERANCE = 0.01;

/**
 * Row count from a drizzle/mysql2 write.
 *
 * mysql2 resolves a write to `[ResultSetHeader, FieldPacket[]]` — the count is
 * on element 0, NOT on the promise's value itself. Reading `.affectedRows`
 * straight off the result silently yielded `undefined` on every call, which is
 * how the settlement claim below came to always look lost: no order was ever
 * marked paid, no payment link was ever burned, and no confirmation email was
 * ever sent. Both shapes are accepted here so a driver change can't
 * reintroduce a failure whose only symptom is silence.
 *
 * Note this relies on MySQL's default `affectedRows` semantics (rows actually
 * changed, not merely matched), which is sound for the claim below because its
 * WHERE guarantees `settledTxnRef` is about to take a new value.
 */
function affectedRowsOf(result: unknown): number {
	const header = Array.isArray(result) ? result[0] : result;
	return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

/**
 * Verify a payment attempt with Chapa and, if genuinely paid, settle it.
 *
 * Safe to call repeatedly and concurrently for the same txRef — only the first
 * call that observes an unsettled payment link performs the write and sends the
 * confirmation.
 */
export async function settlePaymentAttempt(txRef: string): Promise<SettlementOutcome> {
	if (!txRef) {
		return { status: 'pending', orderId: null, reason: 'No payment reference supplied.', retryable: false };
	}

	// The order id is embedded in the ref we generated: ord{id}-{mode}-{nonce}
	const parsed = txRef.match(/^ord(\d+)-(bal|adv|full)-/);
	if (!parsed) {
		return { status: 'pending', orderId: null, reason: 'Unrecognised payment reference.', retryable: false };
	}
	const orderId = Number(parsed[1]);

	const order = await db
		.select({ id: orders.id, transactionId: orders.transactionId })
		.from(orders)
		.where(eq(orders.id, orderId))
		.then((rows) => rows[0]);

	if (!order?.transactionId) {
		return { status: 'pending', orderId, reason: 'This order has no payment record.', retryable: false };
	}

	const transaction = await db
		.select()
		.from(transactions)
		.where(eq(transactions.id, order.transactionId))
		.then((rows) => rows[0]);

	if (!transaction) {
		return { status: 'pending', orderId, reason: 'This order has no payment record.', retryable: false };
	}

	// Only ever settle the attempt that is actually in flight. A stale ref from
	// an abandoned earlier attempt must not settle the current one.
	if (transaction.txnRef !== txRef) {
		return {
			status: 'pending',
			orderId,
			reason: 'This payment attempt is no longer current.',
			retryable: false
		};
	}

	// --- ask Chapa, and hold it to what we expected ---------------------------
	let verification;
	try {
		verification = await verifyChapaTransaction(txRef);
	} catch (err) {
		console.error('Chapa verify failed:', err);
		return {
			status: 'pending',
			orderId,
			reason: 'Could not reach Chapa to confirm your payment. Try refreshing in a moment.',
			retryable: true
		};
	}

	const succeeded = verification?.status === 'success' && verification?.data?.status === 'success';

	if (!succeeded) {
		if (verification?.data?.status === 'failed') {
			return { status: 'failed', orderId, reason: 'Chapa reported this payment as failed.' };
		}
		return {
			status: 'pending',
			orderId,
			reason: 'Payment not confirmed yet. If you completed checkout on Chapa, this can take a moment.',
			retryable: true
		};
	}

	// A "success" is only ours if it is for OUR reference, OUR currency, and at
	// least the amount we asked for. Previously none of this was checked — any
	// successful verify response marked the order paid.
	const expected = Number(transaction.amount);
	const verifiedAmount = Number(verification?.data?.amount);
	const verifiedRef = verification?.data?.tx_ref;
	const verifiedCurrency = verification?.data?.currency;

	if (verifiedRef && verifiedRef !== txRef) {
		console.error(`Chapa tx_ref mismatch: expected ${txRef}, got ${verifiedRef}`);
		return {
			status: 'pending',
			orderId,
			reason: 'Payment reference mismatch — contact support.',
			retryable: false
		};
	}

	if (verifiedCurrency && verifiedCurrency !== 'ETB') {
		console.error(`Chapa currency mismatch on ${txRef}: got ${verifiedCurrency}`);
		return {
			status: 'pending',
			orderId,
			reason: 'Payment currency mismatch — contact support.',
			retryable: false
		};
	}

	if (!Number.isFinite(verifiedAmount) || verifiedAmount + AMOUNT_TOLERANCE < expected) {
		console.error(
			`Chapa amount short on ${txRef}: expected ${expected}, verified ${verifiedAmount}`
		);
		return {
			status: 'pending',
			orderId,
			reason: 'The amount received does not match the amount due — contact support.',
			retryable: false
		};
	}

	// --- settle, exactly once -------------------------------------------------
	// The conditional UPDATE is the lock: it only matches while this attempt is
	// unsettled, and it both claims and records the settlement in one statement.
	// Two concurrent callers both reach here; exactly one gets affectedRows > 0.
	// Accumulating amountPaid in the same statement keeps the money and the
	// claim atomic — there is no window where one landed without the other.
	const claim = await db
		.update(transactions)
		.set({
			settledTxnRef: txRef,
			amountPaid: sql`${transactions.amountPaid} + ${verifiedAmount}`
		})
		.where(
			and(
				eq(transactions.id, transaction.id),
				// unsettled, or settled against a DIFFERENT (earlier) attempt
				or(isNull(transactions.settledTxnRef), ne(transactions.settledTxnRef, txRef))
			)
		);

	const wonClaim = affectedRowsOf(claim) > 0;

	const adjusted = await getAdjustedOrderTotals(orderId);

	// Re-read rather than trusting the pre-claim snapshot: if we lost the race,
	// the winner's increment is what counts.
	const collected = await db
		.select({ amountPaid: transactions.amountPaid })
		.from(transactions)
		.where(eq(transactions.id, transaction.id))
		.then((rows) => Number(rows[0]?.amountPaid ?? 0));

	// Always compare what has actually been collected against the true current
	// total (adjustments folded in). A 'bal' attempt used to close the order out
	// unconditionally — but the total can grow while the customer is on Chapa
	// (staff add an adjustment and email a new link), and closing out then
	// burned that new link and left the extra amount uncollectable.
	const fullySettled = !adjusted || collected + AMOUNT_TOLERANCE >= adjusted.total;

	if (!wonClaim) {
		// Already settled — by the webhook, or on an earlier visit. Report the
		// current truth without writing or emailing again.
		return { status: 'paid', orderId, fullySettled, alreadySettled: true };
	}

	await db
		.update(transactions)
		.set({ paymentStatus: fullySettled ? 'paid' : 'partially_paid' })
		.where(eq(transactions.id, transaction.id));

	// Payment links are only burned once the order is FULLY settled. Marking
	// them on a partial (advance) payment invalidated links already emailed to
	// the customer; leaving them live means the same link naturally becomes the
	// balance-payment link, which is what the `pay` action already computes.
	if (fullySettled) {
		await markPaymentLinksUsed(orderId);
	}

	// fire-and-forget: we won the claim above, so this runs exactly once
	sendPaymentConfirmation(orderId, verifiedAmount, !fullySettled).catch((err) =>
		console.error('Payment confirmation email/sms error:', err)
	);

	return { status: 'paid', orderId, fullySettled, alreadySettled: false };
}

/**
 * How long an unconfirmed Chapa attempt blocks staff from recording the same
 * money by hand. Chapa can't tell "customer is on the checkout page" apart from
 * "customer closed the tab an hour ago" (both verify as not-yet-paid), so an
 * attempt older than this is treated as abandoned rather than blocking the
 * order forever. A late payment on it still settles — as extra money collected.
 */
const IN_FLIGHT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Before staff record a payment by hand: settle any Chapa attempt that has
 * quietly succeeded, and refuse while a recent one is still unconfirmed.
 * Returns a staff-safe refusal, or null when it is safe to proceed.
 */
export async function checkInFlightPayment(orderId: number): Promise<string | null> {
	const row = await db
		.select({
			txnRef: transactions.txnRef,
			settledTxnRef: transactions.settledTxnRef,
			updatedAt: transactions.updatedAt
		})
		.from(orders)
		.innerJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(eq(orders.id, orderId))
		.then((rows) => rows[0]);

	if (!row?.txnRef || row.settledTxnRef === row.txnRef) return null;

	const outcome = await settlePaymentAttempt(row.txnRef);
	if (outcome.status !== 'pending') return null;
	if (Date.now() - row.updatedAt.getTime() > IN_FLIGHT_WINDOW_MS) return null;

	return 'The customer has started an online (Chapa) payment for this order that is not confirmed yet. Wait a few minutes for it to go through or fail, then try again — recording the payment now could charge them twice.';
}

/**
 * Staff collected the rest of the money by hand (cash, bank transfer, …) —
 * typically when marking an order delivered. Records it as collected so the
 * pay page, balance emails and reports all agree the order is settled:
 * amountPaid becomes the full total, the status becomes paid, and every open
 * payment link is burned so the customer can't pay the same balance online.
 *
 * `transactions.amount` (the in-flight Chapa attempt) is deliberately left
 * alone: overwriting it made a real payment in flight fail as "amount short".
 * Runs inside the caller's transaction. Returns the receipt file this one
 * replaced, for the caller to delete after commit.
 */
export async function recordManualCollection(
	tx: DbLike,
	{
		orderId,
		total,
		paymentMethodId,
		recieptLink,
		userId
	}: {
		orderId: number;
		total: number;
		paymentMethodId: number | null;
		recieptLink: string | null;
		userId?: string;
	}
): Promise<{ replacedReceipt: string | null }> {
	const order = await tx
		.select({ transactionId: orders.transactionId })
		.from(orders)
		.where(eq(orders.id, orderId))
		.for('update')
		.then((rows) => rows[0]);
	if (!order) throw new Error(`recordManualCollection: order #${orderId} not found`);

	const amount = round2(total);
	let replacedReceipt: string | null = null;

	if (!order.transactionId) {
		const [txn] = await tx
			.insert(transactions)
			.values({
				amount: amount.toFixed(2),
				amountPaid: amount.toFixed(2),
				paymentStatus: 'paid',
				paymentMethodId,
				recieptLink,
				createdBy: userId
			})
			.$returningId();
		await tx.update(orders).set({ transactionId: txn.id }).where(eq(orders.id, orderId));
	} else {
		const previous = await tx
			.select({ recieptLink: transactions.recieptLink })
			.from(transactions)
			.where(eq(transactions.id, order.transactionId))
			.for('update')
			.then((rows) => rows[0]);
		if (recieptLink && previous?.recieptLink && previous.recieptLink !== recieptLink) {
			replacedReceipt = previous.recieptLink;
		}

		await tx
			.update(transactions)
			.set({
				// GREATEST, not a plain set: a Chapa settlement that landed a moment
				// ago must not be erased, and money is never recorded twice.
				amountPaid: sql`GREATEST(${transactions.amountPaid}, CAST(${amount} AS DECIMAL(10,2)))`,
				paymentStatus: 'paid',
				paymentMethodId,
				...(recieptLink ? { recieptLink } : {}),
				updatedBy: userId
			})
			.where(eq(transactions.id, order.transactionId));
	}

	await markPaymentLinksUsed(orderId, tx);
	return { replacedReceipt };
}

/**
 * Re-derive paid / partially paid after the total moved (an adjustment was
 * approved). An addition on a paid order reopens a balance; a deduction can
 * close one. Only touches orders that have money collected and a paid /
 * partially-paid status — refunded or disputed records are left to staff.
 */
export async function syncPaymentStatus(tx: DbLike, orderId: number): Promise<void> {
	const row = await tx
		.select({
			transactionId: transactions.id,
			amountPaid: transactions.amountPaid,
			paymentStatus: transactions.paymentStatus
		})
		.from(orders)
		.innerJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(eq(orders.id, orderId))
		.then((rows) => rows[0]);

	const collected = Number(row?.amountPaid ?? 0);
	if (!row || collected <= 0) return;
	if (row.paymentStatus !== 'paid' && row.paymentStatus !== 'partially_paid') return;

	const { total } = await getOrderTotal(orderId, tx);
	const status = collected + AMOUNT_TOLERANCE >= total ? 'paid' : 'partially_paid';
	if (status === row.paymentStatus) return;

	await tx.update(transactions).set({ paymentStatus: status }).where(eq(transactions.id, row.transactionId));
	if (status === 'paid') await markPaymentLinksUsed(orderId, tx);
}

function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
