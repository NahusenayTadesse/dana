import { db } from '$lib/server/db';
import { orders, transactions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { findPaymentLinkByToken } from '$lib/server/paymentLinks';
import { getAdjustedOrderTotals } from '$lib/server/orderAdjustments';
import { settlePaymentAttempt } from '$lib/server/paymentSettlement';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// This page no longer decides anything about payment. Chapa's webhook
// (/api/chapa/webhook) is the primary settlement path; this load is a fallback
// for the customer who lands back here before the webhook has arrived, and it
// delegates to the same idempotent settlePaymentAttempt(). Repeat visits,
// prefetches and concurrent tabs all collapse onto the one conditional UPDATE
// inside that function, so none of them can double-settle or double-email.

export const load: PageServerLoad = async ({ params }) => {
	const link = await findPaymentLinkByToken(params.token);
	if (!link) error(404, 'Payment link not found.');

	const order = await db
		.select({ id: orders.id, transactionId: orders.transactionId })
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

	if (!transaction.txnRef) {
		return {
			status: 'pending' as const,
			orderId: order.id,
			token: params.token,
			reason: 'No payment attempt found for this order yet.'
		};
	}

	// Already settled — by the webhook, or on an earlier visit. Report what is
	// actually true rather than a blanket "paid": an advance that has been
	// collected leaves a real balance outstanding, and saying "paid" there sent
	// customers away thinking they were done.
	if (transaction.settledTxnRef === transaction.txnRef) {
		const adjusted = await getAdjustedOrderTotals(order.id);
		const collected = Number(transaction.amountPaid);
		const remaining = adjusted ? Math.max(0, round2(adjusted.total - collected)) : 0;

		return {
			status: 'paid' as const,
			orderId: order.id,
			token: params.token,
			amountPaid: collected,
			remainingBalance: remaining,
			fullySettled: remaining <= 0
		};
	}

	const outcome = await settlePaymentAttempt(transaction.txnRef);

	if (outcome.status === 'paid') {
		const adjusted = await getAdjustedOrderTotals(order.id);
		const collected = await db
			.select({ amountPaid: transactions.amountPaid })
			.from(transactions)
			.where(eq(transactions.id, transaction.id))
			.then((rows) => Number(rows[0]?.amountPaid ?? 0));
		const remaining = adjusted ? Math.max(0, round2(adjusted.total - collected)) : 0;

		return {
			status: 'paid' as const,
			orderId: order.id,
			token: params.token,
			amountPaid: collected,
			remainingBalance: remaining,
			fullySettled: outcome.fullySettled && remaining <= 0
		};
	}

	if (outcome.status === 'failed') {
		return { status: 'failed' as const, orderId: order.id, token: params.token };
	}

	return {
		status: 'pending' as const,
		orderId: order.id,
		token: params.token,
		reason: outcome.reason
	};
};

function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
