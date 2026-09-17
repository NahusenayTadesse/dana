import { db } from '$lib/server/db';
import { orders, transactions, customers, orderItems, products, colors, priceOffers } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { resolvePaymentLink, expirePaymentLinks } from '$lib/server/paymentLinks';
import { restoreStockForOrder } from '$lib/server/stock';
import { initializeChapaTransaction } from '$lib/server/chapa';
import { getAdjustedOrderTotals } from '$lib/server/orderAdjustments';
import { sendOfferRejectedNotice, sendOrderCancelledNotice } from '$lib/server/notifications';
import { error, fail, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import type { PageServerLoad, Actions } from './$types';

// Neither of these can be paid: a cancelled order has nothing to collect, and a
// rejected offer is waiting for staff to send a revised one (with a new link).
// Links are expired when either happens; these checks also cover links issued
// before that was done.
const CANCELLED_MESSAGE = 'This order has been cancelled, so it can no longer be paid.';
const REJECTED_MESSAGE =
	'This offer was declined. We will send you a new payment link once the offer has been revised.';

/** Currency is 2dp everywhere else (pricing.ts, orderAdjustments.ts) — match it. */
function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const load: PageServerLoad = async ({ params }) => {
	const link = await resolvePaymentLink(params.token);
	if (!link) {
		error(410, 'This payment link is invalid, expired, or has already been used.');
	}

	const order = await db
		.select({
			id: orders.id,
			status: orders.status,
			requestStatus: orders.requestStatus,
			transactionId: orders.transactionId,
			customerId: orders.customerId
		})
		.from(orders)
		.where(eq(orders.id, link.orderId))
		.then((rows) => rows[0]);

	if (!order) error(404, 'Order not found');
	if (order.status === 'cancelled') error(410, CANCELLED_MESSAGE);

	const transaction = order.transactionId
		? await db
				.select()
				.from(transactions)
				.where(eq(transactions.id, order.transactionId))
				.then((rows) => rows[0])
		: undefined;

	if (!transaction) error(500, 'This order has no associated payment record — contact support.');

	const customer = order.customerId
		? await db
				.select()
				.from(customers)
				.where(eq(customers.id, order.customerId))
				.then((rows) => rows[0])
		: undefined;

	if (!customer) error(500, 'This order has no associated customer — contact support.');

	// The spec lives directly on orderItems now (the customer's actual
	// requested spec), not necessarily a catalog variant.
	const items = await db
		.select({
			quantity: orderItems.quantity,
			price: orderItems.price,
			priceIncludesVat: orderItems.priceIncludesVat,
			productName: products.name,
			productImage: products.featuredImage,
			colorName: colors.name,
			width: orderItems.width,
			widthUnit: orderItems.widthUnit,
			thickness: orderItems.thickness,
			thicknessUnit: orderItems.thicknessUnit,
			length: orderItems.length,
			lengthUnit: orderItems.lengthUnit
		})
		.from(orderItems)
		.leftJoin(products, eq(products.id, orderItems.productId))
		.leftJoin(colors, eq(colors.id, orderItems.colorId))
		.where(eq(orderItems.orderId, order.id));

	// The accepted price offer carries the VAT/withholding/total breakdown and
	// the advance-payment terms this page is built around.
	const offer = await db
		.select()
		.from(priceOffers)
		.where(eq(priceOffers.orderId, order.id))
		.orderBy(desc(priceOffers.revision))
		.limit(1)
		.then((rows) => rows[0]);

	if (!offer) error(500, 'This order has no price offer — contact support.');
	if (offer.status === 'rejected') error(410, REJECTED_MESSAGE);

	// The TRUE current total — every approved adjustment (see orderAdjustments)
	// folded in, not just the accepted offer's own numbers.
	const adjusted = await getAdjustedOrderTotals(order.id);
	if (!adjusted) error(500, 'This order has no price offer — contact support.');

	const total = adjusted.total;
	const advancePercentage = Number(offer.advancePaymentPercentage);
	// A default of 100% means "pay in full" — no advance option, per the offer.
	const advanceAvailable = advancePercentage < 100;
	// round2, not Math.round: whole-unit rounding meant an advance and its
	// balance could fail to sum to the total, leaving the order permanently a
	// fraction short of settled.
	const advanceAmount = advanceAvailable ? round2(total * (advancePercentage / 100)) : total;

	// Anything already collected on this order (a prior advance, a prior full
	// payment now topped up by an addition adjustment, etc). This reads the
	// dedicated amountPaid column — `amount` is the size of the attempt
	// currently in flight and is rewritten on every checkout, so using it here
	// meant an abandoned balance attempt overwrote the record of the advance.
	const amountPaid = Number(transaction.amountPaid);
	const isBalancePayment = amountPaid > 0;
	const remainingBalance = isBalancePayment ? Math.max(0, round2(total - amountPaid)) : total;

	return {
		token: params.token,
		order,
		items,
		offer,
		adjusted,
		customerName: customer.name,
		alreadyPaid: remainingBalance <= 0 && amountPaid > 0,
		amount: amountPaid,
		total,
		advanceAvailable: advanceAvailable && !isBalancePayment,
		advancePercentage,
		advanceAmount,
		isBalancePayment,
		remainingBalance,
		// Once staff have approved the order the offer is agreed — it can be
		// paid or cancelled, not rejected.
		canReject: order.requestStatus !== 'approved'
	};
};

export const actions: Actions = {
	pay: async ({ params, url, request }) => {
		const link = await resolvePaymentLink(params.token);
		if (!link) return fail(410, { message: 'This payment link is invalid or expired.' });

		const order = await db
			.select()
			.from(orders)
			.where(eq(orders.id, link.orderId))
			.then((rows) => rows[0]);

		if (!order?.transactionId) return fail(500, { message: 'No payment record for this order.' });
		if (order.status === 'cancelled') return fail(410, { message: CANCELLED_MESSAGE });

		const transaction = await db
			.select()
			.from(transactions)
			.where(eq(transactions.id, order.transactionId))
			.then((rows) => rows[0]);

		if (!transaction) return fail(500, { message: 'No payment record for this order.' });

		const adjusted = await getAdjustedOrderTotals(order.id);
		if (!adjusted) return fail(500, { message: 'This order has no price offer.' });

		const total = adjusted.total;
		const latestOffer = await db
			.select({
				advancePaymentPercentage: priceOffers.advancePaymentPercentage,
				status: priceOffers.status
			})
			.from(priceOffers)
			.where(eq(priceOffers.orderId, order.id))
			.orderBy(desc(priceOffers.revision))
			.limit(1)
			.then((rows) => rows[0]);
		if (latestOffer?.status === 'rejected') return fail(410, { message: REJECTED_MESSAGE });
		const advancePercentage = Number(latestOffer?.advancePaymentPercentage ?? 100);

		// See the load above: amountPaid is the collected total, `amount` is the
		// in-flight attempt and must never be read as "already paid".
		const amountPaid = Number(transaction.amountPaid);
		const isBalancePayment = amountPaid > 0;
		const advanceAvailable = advancePercentage < 100 && !isBalancePayment;

		if (isBalancePayment && round2(total - amountPaid) <= 0) {
			return fail(400, { message: 'This order has already been paid.' });
		}
		if (!isBalancePayment && transaction.paymentStatus === 'paid') {
			return fail(400, { message: 'This order has already been paid.' });
		}

		const formData = await request.formData();
		const choice = formData.get('choice'); // 'advance' | 'full'
		const isAdvance = advanceAvailable && choice === 'advance';
		const payAmount = isBalancePayment
			? Math.max(0, round2(total - amountPaid))
			: isAdvance
				? round2(total * (advancePercentage / 100))
				: total;

		if (isBalancePayment && payAmount <= 0) {
			return fail(400, { message: 'This order has no remaining balance.' });
		}

		const customer = await db
			.select()
			.from(customers)
			.where(eq(customers.id, order.customerId!))
			.then((rows) => rows[0]);

		if (!customer) return fail(500, { message: 'No customer record for this order.' });

		// The txRef mode prefix (bal/adv/full) is the source of truth the
		// /complete step reads back to classify this specific attempt — it
		// doesn't rely on the transaction's pre-update paymentStatus, which
		// becomes ambiguous once an addition adjustment reopens a balance on
		// an order that already reads 'paid'.
		const mode = isBalancePayment ? 'bal' : isAdvance ? 'adv' : 'full';
		const txRef = `ord${order.id}-${mode}-${randomBytes(6).toString('hex')}`;
		await db
			.update(transactions)
			.set({ txnRef: txRef, amount: String(payAmount) })
			.where(eq(transactions.id, transaction.id));

		const [firstName, ...rest] = customer.name.trim().split(/\s+/);

		let checkoutUrl: string;
		try {
			checkoutUrl = await initializeChapaTransaction({
				amount: payAmount,
				email: customer.email,
				firstName: firstName || customer.name,
				lastName: rest.join(' ') || firstName || customer.name,
				phoneNumber: customer.phone ?? undefined,
				txRef,
				// callbackUrl is the server-to-server webhook — this used to point
				// at the return PAGE, which meant nothing confirmed the payment if
				// the customer closed the tab. returnUrl is where the human lands.
				callbackUrl: `${url.origin}/api/chapa/webhook`,
				returnUrl: `${url.origin}/pay/${params.token}/complete`,
				title: `Order #${order.id}`,
				description: isBalancePayment
					? `Remaining balance for order #${order.id}`
					: isAdvance
						? `Advance payment (${advancePercentage}%) for order #${order.id}`
						: `Payment for order #${order.id}`
			});
		} catch (err) {
			console.error('Chapa initialize error:', err);
			return fail(502, { message: 'Could not start payment right now. Please try again shortly.' });
		}

		redirect(303, checkoutUrl);
	},

	rejectOffer: async ({ params, request }) => {
		const link = await resolvePaymentLink(params.token);
		if (!link) return fail(410, { message: 'This payment link is invalid or expired.' });

		const order = await db.select().from(orders).where(eq(orders.id, link.orderId)).then((rows) => rows[0]);
		if (!order) return fail(404, { message: 'Order not found.' });
		if (order.status === 'cancelled') return fail(410, { message: CANCELLED_MESSAGE });
		if (order.requestStatus === 'approved') {
			return fail(400, {
				message:
					'This offer has already been confirmed and your order is being prepared. If something is wrong, please contact us.'
			});
		}

		const transaction = order.transactionId
			? await db.select().from(transactions).where(eq(transactions.id, order.transactionId)).then((rows) => rows[0])
			: undefined;
		if (transaction?.paymentStatus === 'paid') {
			return fail(400, { message: 'This order has already been paid — contact us directly if something is wrong.' });
		}

		const offer = await db
			.select()
			.from(priceOffers)
			.where(eq(priceOffers.orderId, order.id))
			.orderBy(desc(priceOffers.revision))
			.limit(1)
			.then((rows) => rows[0]);
		if (!offer) return fail(500, { message: 'This order has no price offer.' });

		const formData = await request.formData();
		const reason = (formData.get('reason') as string | null)?.trim() || null;

		// A rejected offer can't be paid, so its links die with it — the revised
		// offer goes out with a fresh one.
		await db.transaction(async (tx) => {
			await tx.update(priceOffers).set({ status: 'rejected' }).where(eq(priceOffers.id, offer.id));
			await expirePaymentLinks(order.id, tx);
		});

		await sendOfferRejectedNotice(order.id, reason).catch((err) =>
			console.error('Offer rejected notice failed:', err)
		);

		return { rejected: true as const };
	},

	cancelOrder: async ({ params, request }) => {
		const link = await resolvePaymentLink(params.token);
		if (!link) return fail(410, { message: 'This payment link is invalid or expired.' });

		const order = await db.select().from(orders).where(eq(orders.id, link.orderId)).then((rows) => rows[0]);
		if (!order) return fail(404, { message: 'Order not found.' });

		if (order.status === 'cancelled') return fail(410, { message: CANCELLED_MESSAGE });
		if (order.status === 'delivered') {
			return fail(400, { message: 'This order has already been delivered — contact us directly if something is wrong.' });
		}

		const transaction = order.transactionId
			? await db.select().from(transactions).where(eq(transactions.id, order.transactionId)).then((rows) => rows[0])
			: undefined;
		if (transaction?.paymentStatus === 'paid') {
			return fail(400, { message: 'This order has already been paid — contact us directly if something is wrong.' });
		}

		const formData = await request.formData();
		const reason = (formData.get('reason') as string | null)?.trim() || null;

		try {
			await db.transaction(async (tx) => {
				await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, order.id));
				// Nothing left to pay on a cancelled order — kill every live link.
				await expirePaymentLinks(order.id, tx);
				// No-op unless stock was taken out for this order.
				await restoreStockForOrder(tx, order.id);
			});
		} catch (err) {
			console.error('Customer cancel failed:', err);
			return fail(500, { message: 'Could not cancel the order right now. Please contact us.' });
		}

		await sendOrderCancelledNotice(order.id, reason).catch((err) =>
			console.error('Order cancelled notice failed:', err)
		);

		return { cancelled: true as const };
	}
};
