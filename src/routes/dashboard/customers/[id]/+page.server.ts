import { zod4 } from 'sveltekit-superforms/adapters';
import { edit } from './schema.js';
import { db } from '$lib/server/db';
import { orders, customers, paymentMethods, user } from '$lib/server/db/schema';
import { count, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fail, message, setError, superValidate } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';
import { fetchCustomerOrderHistory, type OrderHistoryStatus } from '$lib/server/customerOrderHistory';
import { parseIdParam } from '$lib/server/params';
import { isDuplicateEntry, isRowReferenced } from '$lib/server/dbErrors';
import { deleteUploadedFile } from '$lib/server/upload';

const STATUSES = ['pending', 'delivered', 'cancelled'] as const;

export const load: PageServerLoad = async ({ params, url }) => {
	const customerId = parseIdParam(params.id);

	const customer = await db
		.select({
			id: customers.id,
			customerName: customers.name,
			phone: customers.phone,
			email: customers.email,
			address: customers.address,
			status: customers.isActive,
			type: customers.type,
			tinNo: customers.tinNo,
			docs: customers.docs,
			daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
			createdBy: user.name,
			createdById: user.id,
			createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%Y-%m-%d')`
		})
		.from(customers)
		.leftJoin(user, eq(customers.createdBy, user.id))
		// Without this the page showed (and the edit form saved over) whichever
		// customer MySQL happened to return first.
		.where(eq(customers.id, customerId))
		.then((rows) => rows[0]);

	if (!customer) error(404, 'Customer not found');

	// Pre-filled here rather than by assigning $form in the component, so the
	// form always starts from the customer in the URL.
	const form = await superValidate(
		{
			name: customer.customerName,
			phone: customer.phone,
			email: customer.email,
			address: customer.address,
			status: customer.status
		},
		zod4(edit),
		{ errors: false }
	);

	const orderCounts = await db
		.select({
			status: orders.status,
			count: sql<number>`count(${orders.id})`.mapWith(Number)
		})
		.from(orders)
		.where(eq(orders.customerId, customerId))
		.groupBy(orders.status);

	const allMethods = await db
		.select({
			value: paymentMethods.id,
			name: paymentMethods.name,
			description: paymentMethods.description
		})
		.from(paymentMethods)
		.where(eq(paymentMethods.isActive, true));

	const raw = url.searchParams.get('status');
	const status: OrderHistoryStatus | null = STATUSES.includes(raw as OrderHistoryStatus)
		? (raw as OrderHistoryStatus)
		: null;
	const q = (url.searchParams.get('q') ?? '').trim();
	const page = Number(url.searchParams.get('page')) || 1;

	const history = await fetchCustomerOrderHistory({ customerId, status, q, page, perPage: 5 });

	return {
		customer,
		form,
		allMethods,
		activeStatus: status ?? 'all',
		q,
		history,
		orderCounts
	};
};

export const actions: Actions = {
	edit: async ({ request, locals, params }) => {
		const customerId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check your form.' }, { status: 400 });
		}
		const { name, phone, email, status, address } = form.data;

		try {
			const found = await db.transaction(async (tx) => {
				const existing = await tx
					.select({ userId: customers.userId })
					.from(customers)
					.where(eq(customers.id, customerId))
					.then((rows) => rows[0]);

				if (!existing) return false;

				await tx
					.update(customers)
					.set({
						name,
						email,
						phone: phone || null,
						address: address || null,
						isActive: status,
						updatedBy: locals?.user?.id
					})
					.where(eq(customers.id, customerId));

				// Guest customers have no linked login account — nothing to sync.
				if (existing.userId) {
					await tx.update(user).set({ email }).where(eq(user.id, existing.userId));
				}
				return true;
			});

			if (!found) {
				return message(form, { type: 'error', text: 'This customer no longer exists.' }, { status: 404 });
			}

			return message(form, { type: 'success', text: 'Customer updated successfully.' });
		} catch (err) {
			console.error('Error updating customer:', err);
			if (isDuplicateEntry(err)) {
				return setError(form, 'email', 'Another customer or user already uses this email.');
			}
			return message(
				form,
				{ type: 'error', text: 'Could not update the customer. Please try again.' },
				{ status: 500 }
			);
		}
	},
	delete: async ({ cookies, params, locals }) => {
		const customerId = parseIdParam(params.id);

		const customer = await db
			.select({ docs: customers.docs })
			.from(customers)
			.where(eq(customers.id, customerId))
			.then((rows) => rows[0]);

		if (!customer) {
			setFlash({ type: 'error', message: 'This customer no longer exists.' }, cookies);
			return fail(404);
		}

		const deactivate = async (reason: string) => {
			await db
				.update(customers)
				.set({ isActive: false, updatedBy: locals?.user?.id })
				.where(eq(customers.id, customerId));
			setFlash(
				{
					type: 'success',
					message: `${reason} so the customer was deactivated instead of deleted.`
				},
				cookies
			);
		};

		try {
			// Orders keep their customer for the sales history, so a customer who
			// ever ordered is deactivated rather than deleted.
			const orderCount = await db
				.select({ n: count() })
				.from(orders)
				.where(eq(orders.customerId, customerId))
				.then((rows) => rows[0]?.n ?? 0);

			if (orderCount > 0) {
				await deactivate(
					`This customer has ${orderCount} ${orderCount === 1 ? 'order' : 'orders'} on record,`
				);
				return;
			}

			await db.delete(customers).where(eq(customers.id, customerId));

			if (customer.docs) {
				await deleteUploadedFile(customer.docs).catch((err) =>
					console.error('Could not remove customer document:', err)
				);
			}

			setFlash({ type: 'success', message: 'Customer deleted successfully.' }, cookies);
		} catch (err) {
			console.error('Error deleting customer:', err);
			try {
				if (isRowReferenced(err)) {
					await deactivate('This customer is still referenced by other records,');
					return;
				}
			} catch (inner) {
				console.error('Error deactivating customer:', inner);
			}
			setFlash({ type: 'error', message: 'Could not delete the customer. Please try again.' }, cookies);
			return fail(500);
		}
	}
};
