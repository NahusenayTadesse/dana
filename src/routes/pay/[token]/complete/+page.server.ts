import { db } from '$lib/server/db';
import { orders, transactions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { findPaymentLinkByToken, markPaymentLinkUsed } from '$lib/server/paymentLinks';
import { verifyChapaTransaction } from '$lib/server/chapa';
import { getAdjustedOrderTotals } from '$lib/server/orderAdjustments';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { sendPaymentConfirmation } from '$lib/server/notifications';

export const load: PageServerLoad = async ({ params }) => {
	const link = await findPaymentLinkByToken(params.token);
	if (!link) error(404, 'Payment link not found.');

	const order = await db
		.select()
		.from(orders)
		.where(eq(orders.id, link.orderId))
		.then((rows) => rows[0]);

	if (!order?.transactionId) error(500, 'This order has no payment record — contact support.');

	const transaction = await db
		.select()
		.from(transactions)
		.where(eq(transactions.id, order.transactionId))
		.then((rows) => rows[0]);

	if (!transaction) error(500, 'This order has no payment record — contact support.');

	// Already confirmed on a previous visit to THIS specific link — just show
	// the receipt, don't re-verify. Scoped to the link (not the transaction's
	// overall status), since the same transaction row is reused across a
	// balance-payment link generated after an earlier advance — the
	// transaction can already read 'partially_paid' from that prior payment
	// while THIS link's own attempt hasn't been verified yet.
	if (link.usedAt) {
		return { status: 'paid' as const, orderId: order.id, token: params.token };
	}

	if (!transaction.txnRef) {
		return {
			status: 'pending' as const,
			orderId: order.id,
			token: params.token,
			reason: 'No payment attempt found for this order yet.'
		};
	}

	// This is the ONE place that decides an order is paid — a direct server-to-server
	// call to Chapa, not anything trusted from the URL or the browser.
	let verification;
	try {
		verification = await verifyChapaTransaction(transaction.txnRef);
	} catch (err) {
		console.error('Chapa verify failed:', err);
		return {
			status: 'pending' as const,
			orderId: order.id,
			token: params.token,
			reason: 'Could not reach Chapa to confirm your payment. Try refreshing in a moment.'
		};
	}

	const isPaid = verification?.status === 'success' && verification?.data?.status === 'success';

	if (isPaid) {
		// Which kind of attempt this was (balance / advance / full) is read
		// from the mode prefix `pay`'s action encoded into the txRef
		// (`ord{id}-{bal|adv|full}-...`) — not from the transaction's
		// pre-update paymentStatus, which is ambiguous once an addition
		// adjustment reopens a balance on an order that already reads 'paid'.
		const mode = transaction.txnRef?.match(/^ord\d+-(bal|adv|full)-/)?.[1];
		const wasBalanceSettlement = mode === 'bal';
		const payAmount = Number(transaction.amount);

		const adjusted = await getAdjustedOrderTotals(order.id);

		// A balance-payment link always settles the order fully once it succeeds.
		const isAdvance = !wasBalanceSettlement && !!adjusted && payAmount < adjusted.total;

		await db
			.update(transactions)
			.set({ paymentStatus: isAdvance ? 'partially_paid' : 'paid' })
			.where(eq(transactions.id, transaction.id));
		await markPaymentLinkUsed(order.id);

		// fire-and-forget — the `link.usedAt` guard at the top of this load
		// already prevents this from firing again on a repeat visit
		sendPaymentConfirmation(order.id, payAmount, isAdvance).catch((err) =>
			console.error('Payment confirmation email/sms error:', err)
		);

		return { status: 'paid' as const, orderId: order.id, token: params.token };
	}

	if (verification?.data?.status === 'failed') {
		return { status: 'failed' as const, orderId: order.id, token: params.token };
	}

	return {
		status: 'pending' as const,
		orderId: order.id,
		token: params.token,
		reason: 'Payment not confirmed yet. If you completed checkout on Chapa, this can take a moment.'
	};
};
