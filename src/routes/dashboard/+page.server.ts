import { auth } from '$lib/server/auth';
import { redirect } from 'sveltekit-flash-message/server';

import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { products, orders, orderItems, transactions } from '$lib/server/db/schema';
import { lte, eq, sql, and, or, gte, lt, inArray, isNull, isNotNull, gt } from 'drizzle-orm';
import { priceLine, type PricingBasis } from '$lib/server/pricing';
import { getAdjustedOrderTotals } from '$lib/server/orderAdjustments';
import { round2 } from '$lib/vat';

// The business runs on Addis Ababa time (UTC+3, no daylight saving), so "today"
// is that calendar day wherever the server or database happens to be.
const BUSINESS_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

function businessDayWindow(now = new Date()) {
	const local = new Date(now.getTime() + BUSINESS_UTC_OFFSET_MS);
	const startMs =
		Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
		BUSINESS_UTC_OFFSET_MS;
	return {
		start: new Date(startMs),
		end: new Date(startMs + 24 * 60 * 60 * 1000),
		startSec: startMs / 1000,
		endSec: startMs / 1000 + 24 * 60 * 60
	};
}

const COLLECTED_STATUSES = ['paid', 'partially_paid', 'overpaid'] as const;

export const load: PageServerLoad = async () => {
	// Deactivated products are off the catalog, so they don't need restocking.
	const reorderProducts = await db
		.select({
			name: products.name,
			quantity: products.quantity
		})
		.from(products)
		.where(and(eq(products.isActive, true), lte(products.quantity, products.reorderLevel)));

	const day = businessDayWindow();

	// `timestamp` columns are compared through UNIX_TIMESTAMP(), which is a real
	// instant whatever the DB session timezone is. `stock_deducted_at` is a
	// `datetime` written by mysql2 from a JS Date, so it is compared against JS
	// Dates, which mysql2 serialises the same way.
	const timestampToday = (column: typeof orders.updatedAt | typeof transactions.updatedAt) =>
		sql`UNIX_TIMESTAMP(${column}) >= ${day.startSec} AND UNIX_TIMESTAMP(${column}) < ${day.endSec}`;

	// There is no "delivered at" column: delivery claims `stock_deducted_at`, and
	// orders delivered before stock was automated fall back to their last update.
	const deliveredToday = await db
		.select({ id: orders.id })
		.from(orders)
		.where(
			and(
				eq(orders.status, 'delivered'),
				or(
					and(
						isNotNull(orders.stockDeductedAt),
						gte(orders.stockDeductedAt, day.start),
						lt(orders.stockDeductedAt, day.end)
					),
					and(isNull(orders.stockDeductedAt), timestampToday(orders.updatedAt))
				)
			)
		);
	const deliveredIds = deliveredToday.map((row) => row.id);

	const lines = deliveredIds.length
		? await db
				.select({
					orderId: orderItems.orderId,
					quantity: orderItems.quantity,
					length: orderItems.length,
					width: orderItems.width,
					thickness: orderItems.thickness,
					weight: orderItems.weight,
					priceBasis: orderItems.priceBasis,
					price: orderItems.price,
					priceIncludesVat: orderItems.priceIncludesVat
				})
				.from(orderItems)
				.where(inArray(orderItems.orderId, deliveredIds))
		: [];

	let totalRevenue = 0;
	for (const orderId of deliveredIds) {
		// A quoted order is billed its accepted offer (adjustments folded in).
		// A staff-created order has no offer, so each line is priced on its own
		// basis (per piece / metre / area …) at the rate as it was entered.
		const adjusted = await getAdjustedOrderTotals(orderId);
		if (adjusted) {
			totalRevenue += adjusted.total;
			continue;
		}
		for (const line of lines) {
			if (line.orderId !== orderId || line.price == null) continue;
			const unitPrice = Number(line.price);
			const { units } = priceLine(
				{
					quantity: line.quantity,
					length: line.length != null ? Number(line.length) : null,
					width: line.width != null ? Number(line.width) : null,
					thickness: line.thickness != null ? Number(line.thickness) : null,
					weight: line.weight != null ? Number(line.weight) : null,
					basis: line.priceBasis as PricingBasis,
					unitPrice,
					priceIncludesVat: line.priceIncludesVat
				},
				0
			);
			totalRevenue += units * unitPrice;
		}
	}

	// Money actually collected is `amountPaid` (`amount` is only the attempt in
	// flight). One row per order transaction — never joined through order lines,
	// which counted each payment once per line item.
	const paymentsToday = await db
		.selectDistinct({ id: transactions.id, amountPaid: transactions.amountPaid })
		.from(transactions)
		.innerJoin(orders, eq(orders.transactionId, transactions.id))
		.where(
			and(
				inArray(transactions.paymentStatus, [...COLLECTED_STATUSES]),
				gt(transactions.amountPaid, '0'),
				timestampToday(transactions.updatedAt)
			)
		);

	const totalOrders = deliveredIds.length;
	const dailyStats = {
		totalOrders,
		totalItemsSold: lines.reduce((sum, line) => sum + Number(line.quantity ?? 0), 0),
		totalRevenue: round2(totalRevenue),
		averageOrderValue: totalOrders ? round2(totalRevenue / totalOrders) : 0,
		totalPaymentsCollected: round2(
			paymentsToday.reduce((sum, row) => sum + Number(row.amountPaid), 0)
		)
	};

	return {
		reorderProducts,
		dailyStats
	};
};

export const actions: Actions = {
	logout: async (event) => {
		await auth.api.signOut({
			headers: event.request.headers
		});
		redirect('/login', { type: 'success', message: 'Logout Successful' }, event.cookies);
	}
};
