import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { customers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import { fetchCustomerOrderHistory, type OrderHistoryStatus } from '$lib/server/customerOrderHistory';

const STATUSES = ['pending', 'delivered', 'cancelled'] as const;

export const load: PageServerLoad = async ({ params, url }) => {
	const customerId = Number(params.id);
	if (!Number.isInteger(customerId)) error(404, 'Not found.');

	const customer = await db
		.select({ customerName: customers.name })
		.from(customers)
		.where(eq(customers.id, customerId))
		.then((rows) => rows[0]);

	const raw = url.searchParams.get('status');
	const status: OrderHistoryStatus | null = STATUSES.includes(raw as OrderHistoryStatus)
		? (raw as OrderHistoryStatus)
		: null;
	const q = (url.searchParams.get('q') ?? '').trim();
	const page = Number(url.searchParams.get('page')) || 1;

	const history = await fetchCustomerOrderHistory({ customerId, status, q, page });

	return {
		customer,
		activeStatus: status ?? 'all',
		q,
		history
	};
};
