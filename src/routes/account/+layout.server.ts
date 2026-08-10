import { db } from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

import { customers, orders } from '$lib/server/db/schema';
import { and, eq, count } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	const name = locals.user.name;

	// Scoped to the signed-in customer's OWN orders.
	//
	// This block was copy-pasted from the admin dashboard layout, minus the
	// admin gate: it counted every pending order in the business, and every
	// unread contact message, and handed both to any logged-in customer. The
	// unread-messages count is a staff metric with no place on a customer page
	// at all, so it's gone rather than rescoped.
	const customer = await db
		.select({ id: customers.id })
		.from(customers)
		.where(eq(customers.userId, locals.user.id))
		.then((rows) => rows[0]);

	const ordersNumber = customer
		? await db
				.select({ count: count(orders.id) })
				.from(orders)
				.where(and(eq(orders.customerId, customer.id), eq(orders.status, 'pending')))
				.then((rows) => rows[0]?.count ?? 0)
		: 0;

	return {
		name,
		ordersNumber
	};
};
