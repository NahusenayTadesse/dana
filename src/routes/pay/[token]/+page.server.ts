import { db } from '$lib/server/db';
import {
	orders,
	transactions,
	customers,
	orderItems,
	productVariants,
	products,
	colors,
	widths,
	thicknesses
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { resolvePaymentLink } from '$lib/server/paymentLinks';
import { initializeChapaTransaction } from '$lib/server/chapa';
import { error, fail, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const link = await resolvePaymentLink(params.token);
	if (!link) {
		error(410, 'This payment link is invalid, expired, or has already been used.');
	}

	const order = await db
		.select({
			id: orders.id,
			status: orders.status,
			transactionId: orders.transactionId,
			customerId: orders.customerId
		})
		.from(orders)
		.where(eq(orders.id, link.orderId))
		.then((rows) => rows[0]);

	if (!order) error(404, 'Order not found');

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

	const items = await db
		.select({
			quantity: orderItems.quantity,
			price: orderItems.price,
			variantId: orderItems.variantId,
			productName: products.name,
			productImage: products.featuredImage,
			colorName: colors.name,
			widthValue: widths.value,
			widthUnit: widths.unit,
			widthLabel: widths.label,
			thicknessValue: thicknesses.value,
			thicknessUnit: thicknesses.unit
		})
		.from(orderItems)
		.leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
		.leftJoin(products, eq(products.id, orderItems.productId))
		.leftJoin(colors, eq(colors.id, productVariants.colorId))
		.leftJoin(widths, eq(widths.id, productVariants.widthId))
		.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
		.where(eq(orderItems.orderId, order.id));

	return {
		token: params.token,
		order,
		items,
		customerName: customer.name,
		alreadyPaid: transaction.paymentStatus === 'paid',
		amount: Number(transaction.amount)
	};
};

export const actions: Actions = {
	pay: async ({ params, url }) => {
		const link = await resolvePaymentLink(params.token);
		if (!link) return fail(410, { message: 'This payment link is invalid or expired.' });

		const order = await db
			.select()
			.from(orders)
			.where(eq(orders.id, link.orderId))
			.then((rows) => rows[0]);

		if (!order?.transactionId) return fail(500, { message: 'No payment record for this order.' });

		const transaction = await db
			.select()
			.from(transactions)
			.where(eq(transactions.id, order.transactionId))
			.then((rows) => rows[0]);

		if (!transaction) return fail(500, { message: 'No payment record for this order.' });
		if (transaction.paymentStatus === 'paid') {
			return fail(400, { message: 'This order has already been paid.' });
		}

		const customer = await db
			.select()
			.from(customers)
			.where(eq(customers.id, order.customerId!))
			.then((rows) => rows[0]);

		if (!customer) return fail(500, { message: 'No customer record for this order.' });

		// Fresh tx_ref on every attempt — lets the customer retry after a failed payment
		const txRef = `ord${order.id}-${randomBytes(6).toString('hex')}`;
		await db.update(transactions).set({ txnRef: txRef }).where(eq(transactions.id, transaction.id));

		const [firstName, ...rest] = customer.name.trim().split(/\s+/);

		let checkoutUrl: string;
		try {
			checkoutUrl = await initializeChapaTransaction({
	amount: Number(transaction.amount),
	email: customer.email,
	firstName: firstName || customer.name,
	lastName: rest.join(' ') || firstName || customer.name,
	phoneNumber: customer.phone ?? undefined,
	txRef,
	callbackUrl: `${url.origin}/pay/${params.token}/complete`, // was /api/webhooks/chapa
	returnUrl: `${url.origin}/pay/${params.token}/complete`,   // unchanged
	title: `Order #${order.id}`,
	description: `Payment for order #${order.id}`
});
		} catch (err) {
			console.error('=== CHAPA INITIALIZE ERROR ===');
    console.error('Error type:', typeof err);
    console.error('Error constructor:', err.constructor?.name);
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);
    
    // If it's an Axios error
    if (err.isAxiosError) {
        console.error('Axios response data:', err.response?.data);
        console.error('Axios response status:', err.response?.status);
        console.error('Axios response headers:', err.response?.headers);
        console.error('Axios request config:', err.config);
    }
    
    // Log any other properties
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('=== END ERROR ===');
			return fail(502, { message: 'Could not start payment right now. Please try again shortly.' });
		}

		redirect(303, checkoutUrl);
	}
};