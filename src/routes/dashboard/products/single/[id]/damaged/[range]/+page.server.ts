import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { user, damagedProducts } from '$lib/server/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

import { currentMonthFilter, parseDateRange } from '$lib/global.svelte';
import { parseIdParam } from '$lib/server/params';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// NaN ids and junk ranges used to reach MySQL and 500.
	const id = parseIdParam(params.id);
	const range = parseDateRange(params.range);
	if (!range) error(404, 'Not found');
	const { start, end } = range;

	const allTransactions = await db
		.select({
			id: damagedProducts.id,
			date: sql<string>`DATE_FORMAT(${damagedProducts.createdAt}, '%W %Y-%m-%d')`,
			quantity: damagedProducts.quantity,
			reason: damagedProducts.reason,
			damagedBy: damagedProducts.damagedBy,
			changedById: user.id,
			changedBy: user.name
		})
		.from(damagedProducts)
		.leftJoin(user, eq(damagedProducts.createdBy, user.id))
		.where(
			and(
				eq(damagedProducts.productId, id),
				currentMonthFilter(damagedProducts.createdAt, start, end)
			)
		)
		.orderBy(asc(damagedProducts.createdAt));

	return {
		allTransactions,
		start,
		end
	};
};
