import { db } from '$lib/server/db';
import { customers, orders, orderAdjustments } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { fetchCustomerOrderHistory, type OrderHistoryStatus } from '$lib/server/customerOrderHistory';
import { sendAdjustmentRequestedNotice } from '$lib/server/notifications';
import { requestAdjustment } from './schema';

const STATUSES = ['pending', 'delivered', 'cancelled'] as const;

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) return redirect(303, '/');

	const customer = await db
		.select({ id: customers.id, customerName: customers.name })
		.from(customers)
		.where(eq(customers.userId, locals.user.id))
		.then((rows) => rows[0]);

	if (!customer) return redirect(303, '/account');

	const raw = url.searchParams.get('status');
	const status: OrderHistoryStatus | null = STATUSES.includes(raw as OrderHistoryStatus)
		? (raw as OrderHistoryStatus)
		: null;
	const q = (url.searchParams.get('q') ?? '').trim();
	const page = Number(url.searchParams.get('page')) || 1;

	const orderCounts = await db
		.select({
			status: orders.status,
			count: sql<number>`count(${orders.id})`.mapWith(Number)
		})
		.from(orders)
		.where(eq(orders.customerId, customer.id))
		.groupBy(orders.status);

	const history = await fetchCustomerOrderHistory({ customerId: customer.id, status, q, page });
	const requestAdjustmentForm = await superValidate(zod4(requestAdjustment));

	return {
		customer,
		orderCounts,
		activeStatus: status ?? 'all',
		q,
		history,
		requestAdjustmentForm
	};
};

export const actions: Actions = {
	requestAdjustment: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(requestAdjustment));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });
		if (!locals.user) return message(form, { type: 'error', text: 'Please sign in.' }, { status: 401 });

		const { orderId, amount, reason } = form.data;

		try {
			const customer = await db
				.select({ id: customers.id, name: customers.name })
				.from(customers)
				.where(eq(customers.userId, locals.user.id))
				.then((rows) => rows[0]);

			if (!customer) return message(form, { type: 'error', text: 'Customer profile not found.' }, { status: 404 });

			// Only that customer's own, not-yet-delivered orders can have an
			// adjustment requested against them.
			const order = await db
				.select({ id: orders.id, status: orders.status, customerId: orders.customerId })
				.from(orders)
				.where(eq(orders.id, orderId))
				.then((rows) => rows[0]);

			if (!order || order.customerId !== customer.id) {
				return message(form, { type: 'error', text: 'Order not found.' }, { status: 404 });
			}
			if (order.status !== 'pending') {
				return message(
					form,
					{ type: 'error', text: 'Adjustments can only be requested on orders that have not been delivered yet.' },
					{ status: 400 }
				);
			}

			await db.insert(orderAdjustments).values({
				orderId,
				type: 'deduction',
				amount: String(amount),
				reason,
				causedBy: 'customer',
				status: 'pending',
				createdBy: locals.user.id
			});

			await sendAdjustmentRequestedNotice(orderId, customer.name, reason, amount).catch((err) =>
				console.error('Adjustment request notice failed:', err)
			);

			return message(form, { type: 'success', text: 'Your adjustment request has been sent to our team.' });
		} catch (err) {
			console.error('Request adjustment failed:', err);
			return message(form, { type: 'error', text: 'Could not submit your request.' }, { status: 500 });
		}
	}
};
