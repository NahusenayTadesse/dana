import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { transactions, user, productAdjustments } from '$lib/server/db/schema';
import { and, asc, eq, sql } from 'drizzle-orm';

import { currentMonthFilter, parseDateRange } from '$lib/global.svelte';
import { parseIdParam } from '$lib/server/params';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseIdParam(params.id);
	const range = parseDateRange(params.range);
	if (!range) error(404, 'Not found');
	const { start, end } = range;

	const allTransactions = await db
		.select({
			id: productAdjustments.id,
			date: sql<string>`DATE_FORMAT(${productAdjustments.createdAt}, '%W %Y-%m-%d')`,
			quantity: productAdjustments.adjustment,
			reason: productAdjustments.reason,
			changedBy: user.name,
			changedById: user.id,
			reciept: transactions.recieptLink
		})
		.from(productAdjustments)
		.leftJoin(transactions, eq(transactions.id, productAdjustments.transactionId))

		.leftJoin(user, eq(productAdjustments.createdBy, user.id))
		.where(
			and(
				eq(productAdjustments.productsId, id),
				currentMonthFilter(productAdjustments.createdAt, start, end)
			)
		)
		.orderBy(asc(productAdjustments.createdAt));

	return {
		allTransactions,
		start,
		end
	};
};
