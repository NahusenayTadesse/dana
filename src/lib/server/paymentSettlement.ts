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
import { sendPaymentConfirmation } from '$lib/server/notifications';

export type SettlementOutcome =
	| { status: 'paid'; orderId: number; fullySettled: boolean; alreadySettled: boolean }
	| { status: 'failed'; orderId: number | null; reason: string }
	| { status: 'pending'; orderId: number | null; reason: string };

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
	if (!txRef) return { status: 'pending', orderId: null, reason: 'No payment reference supplied.' };

	// The order id is embedded in the ref we generated: ord{id}-{mode}-{nonce}
	const parsed = txRef.match(/^ord(\d+)-(bal|adv|full)-/);
	if (!parsed) {
		return { status: 'pending', orderId: null, reason: 'Unrecognised payment reference.' };
	}
	const orderId = Number(parsed[1]);
	const mode = parsed[2] as 'bal' | 'adv' | 'full';

	const order = await db
		.select({ id: orders.id, transactionId: orders.transactionId })
		.from(orders)
		.where(eq(orders.id, orderId))
		.then((rows) => rows[0]);

	if (!order?.transactionId) {
		return { status: 'pending', orderId, reason: 'This order has no payment record.' };
	}

	const transaction = await db
		.select()
		.from(transactions)
		.where(eq(transactions.id, order.transactionId))
		.then((rows) => rows[0]);

	if (!transaction) {
		return { status: 'pending', orderId, reason: 'This order has no payment record.' };
	}

	// Only ever settle the attempt that is actually in flight. A stale ref from
	// an abandoned earlier attempt must not settle the current one.
	if (transaction.txnRef !== txRef) {
		return { status: 'pending', orderId, reason: 'This payment attempt is no longer current.' };
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
			reason: 'Could not reach Chapa to confirm your payment. Try refreshing in a moment.'
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
			reason: 'Payment not confirmed yet. If you completed checkout on Chapa, this can take a moment.'
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
		return { status: 'pending', orderId, reason: 'Payment reference mismatch — contact support.' };
	}

	if (verifiedCurrency && verifiedCurrency !== 'ETB') {
		console.error(`Chapa currency mismatch on ${txRef}: got ${verifiedCurrency}`);
		return { status: 'pending', orderId, reason: 'Payment currency mismatch — contact support.' };
	}

	if (!Number.isFinite(verifiedAmount) || verifiedAmount + AMOUNT_TOLERANCE < expected) {
		console.error(
			`Chapa amount short on ${txRef}: expected ${expected}, verified ${verifiedAmount}`
		);
		return {
			status: 'pending',
			orderId,
			reason: 'The amount received does not match the amount due — contact support.'
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

	// 'bal' always closes the order out; otherwise compare what has actually
	// been collected against the true current total (adjustments folded in).
	const fullySettled =
		mode === 'bal' || !adjusted || collected + AMOUNT_TOLERANCE >= adjusted.total;

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
