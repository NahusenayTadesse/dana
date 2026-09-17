import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { customers, user, orders } from '$lib/server/db/schema';
import { eq, and, count, sql } from 'drizzle-orm';

// Customers are created by the storefront (sign-up, checkout, quote requests)
// and by the orders screen. The old `addCustomer` action here inserted an
// undefined `name` and no email, so it has been removed rather than kept
// POST-able.

export const load: PageServerLoad = async () => {
	const customersList = await db
		.select({
			id: customers.id,
			customerName: customers.name,
			email: customers.email,
			phone: customers.phone,
			tinNo: customers.tinNo,
			type: customers.type,
			docs: customers.docs,
			status: customers.isActive,
			orderCount: count(orders.id),
			daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
			createdBy: user.name,
			createdById: user.id,
			createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%Y-%m-%d')`
		})
		.from(customers)
		.leftJoin(user, eq(customers.createdBy, user.id))
		.leftJoin(orders, and(eq(orders.customerId, customers.id), eq(orders.status, 'pending')))
		.groupBy(customers.id, user.name, customers.createdAt, customers.name);

	return {
		customersList
	};
};
