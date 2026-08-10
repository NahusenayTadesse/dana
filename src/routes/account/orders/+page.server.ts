import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { orders, customers, orderItems, products } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';

type TrackedItem = {
	id: number;
	productName: string | null;
	quantity: number | null;
	price: string | null;
	total: number;
};

type TrackedOrder = {
	id: number;
	status: string | null;
	createdAt: string;
	updatedAt: string;
	currentStep: number;
	orderTotal: number;
	items: TrackedItem[];
};

/**
 * How far along a pending order is, for the tracking stepper.
 * 1: Order Placed · 2: Processing · 3: In Transit
 *
 * This used to be read off `row.currentStep`, a column that was never in the
 * SELECT and does not exist on the orders table — so every order rendered with
 * an undefined step. There is no such column to select, so the step is derived
 * from what the order actually tells us.
 */
function trackingStep(status: string | null, hasItems: boolean): number {
	if (status === 'delivered') return 3;
	if (hasItems) return 2;
	return 1;
}

export const load: PageServerLoad = async ({ locals }) => {
	// 1. Guard check
	if (!locals.user) redirect(303, '/');

	// 2. Fetch the logged-in customer's ID
	//
	// NOTE: deliberately outside the try below. `error()` and `redirect()` work
	// by throwing, so raising one inside a try/catch that swallows everything
	// turned a legitimate 404 into a 200 with an empty list.
	const customer = await db
		.select({ id: customers.id })
		.from(customers)
		.where(eq(customers.userId, locals.user.id))
		.then((rows) => rows[0]);

	if (!customer) {
		error(404, 'Customer profile not found.');
	}

	// 3. Fetch ONLY pending orders along with an aggregated array of items
	const rawPendingOrders = await db
		.select({
			id: orders.id,
			status: orders.status,
			createdAt: sql<string>`DATE_FORMAT(${orders.createdAt}, '%Y-%m-%d %H:%i')`,
			updatedAt: sql<string>`DATE_FORMAT(${orders.updatedAt}, '%Y-%m-%d %H:%i')`,
			itemId: orderItems.id,
			productName: products.name,
			quantity: orderItems.quantity,
			price: orderItems.price,
			total: sql<number>`coalesce(${orderItems.quantity} * ${orderItems.price}, 0)`.mapWith(Number)
		})
		.from(orders)
		.leftJoin(orderItems, eq(orders.id, orderItems.orderId))
		.leftJoin(products, eq(orderItems.productId, products.id))
		.where(and(eq(orders.customerId, customer.id), eq(orders.status, 'pending')));

	// 4. Reduce flat rows into structured Order objects with child Items
	const pendingOrdersMap = rawPendingOrders.reduce<Record<number, TrackedOrder>>((acc, row) => {
		if (!acc[row.id]) {
			acc[row.id] = {
				id: row.id,
				status: row.status,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				currentStep: 1,
				orderTotal: 0,
				items: []
			};
		}

		if (row.itemId) {
			acc[row.id].items.push({
				id: row.itemId,
				productName: row.productName,
				quantity: row.quantity,
				price: row.price,
				total: row.total
			});
			acc[row.id].orderTotal += row.total;
		}

		return acc;
	}, {});

	const pendingOrders = Object.values(pendingOrdersMap).map((order) => ({
		...order,
		currentStep: trackingStep(order.status, order.items.length > 0)
	}));

	// A genuine DB failure now surfaces as a 500 rather than being reported to
	// the customer as "you have no orders", which made outages indistinguishable
	// from empty state.
	return { pendingOrders };
};
