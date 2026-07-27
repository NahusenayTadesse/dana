import { db } from '$lib/server/db';
import { orders, transactions } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { findPaymentLinkByToken, markPaymentLinkUsed } from '$lib/server/paymentLinks';
import { verifyChapaTransaction } from '$lib/server/chapa';
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

	// Already confirmed on a previous visit — just show the receipt, don't re-verify.
	if (transaction.paymentStatus === 'paid') {
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
	await db
		.update(transactions)
		.set({ paymentStatus: 'paid' })
		.where(eq(transactions.id, transaction.id));
	await markPaymentLinkUsed(order.id);

	// fire-and-forget — the guard at the top of this load (paymentStatus === 'paid')
	// already prevents this from firing again on a repeat visit
	sendPaymentConfirmation(order.id).catch((err) =>
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