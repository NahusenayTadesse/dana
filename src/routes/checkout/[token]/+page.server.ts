import { eq } from 'drizzle-orm';

import { error } from '@sveltejs/kit';

import { db } from '$lib/server/db';
import { orders, orderItems, products, transactions } from '$lib/server/db/schema';

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const { token } = params;

	let base64 = token.replace(/-/g, '+').replace(/_/g, '/');

	// Pad the Base64 string with '=' if necessary
	while (base64.length % 4) {
		base64 += '=';
	}

	// 2. Decode the Base64 string back to normal text
	const decodedPayload = atob(base64);

	// 3. Split it back apart using your delimiter
	const [txnRef, orderId] = decodedPayload.split('||');

	if (!txnRef || !orderId) {
		error(400, 'Invalid transaction token');
	}

	const productList = await db
		.select({
			productName: products.name,
			quantity: orderItems.quantity,
			price: orderItems.price
		})
		.from(orderItems)
		.innerJoin(products, eq(orderItems.productId, products.id))
		.where(eq(orderItems.orderId, Number(orderId)));

	const transactionId = await db
		.select({ id: orders.transactionId })
		.from(orders)
		.where(eq(orders.id, Number(orderId)))
		.limit(1)
		.then(([result]) => result?.id);

	if (!transactionId) error(404, 'Transaction not found');

	await db
		.update(transactions)
		.set({ paymentStatus: 'paid', txnRef })
		.where(eq(transactions.id, transactionId));

	return {
		productList
	};
};
