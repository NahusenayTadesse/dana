import { db } from '$lib/server/db';
import { orders, products, orderItems, transactions } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

import { currentMonthFilter, parseDateRange } from '$lib/global.svelte';
import { priceLine, type PricingBasis } from '$lib/server/pricing';
import { round2 } from '$lib/vat';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	// `/reports/abc` used to become `Invalid Date` → NULL in the query and
	// `CalendarDate(NaN, …)` in the picker.
	const range = parseDateRange(params.range);
	if (!range) error(404, 'Not found');

	const { start, end } = range;

	const rows = await db
		.select({
			orderId: orders.id,
			status: orders.status,
			productName: products.name,
			productId: products.id,
			quantityPurchased: orderItems.quantity,
			unitPrice: orderItems.price,
			priceBasis: orderItems.priceBasis,
			priceIncludesVat: orderItems.priceIncludesVat,
			length: orderItems.length,
			width: orderItems.width,
			thickness: orderItems.thickness,
			weight: orderItems.weight,
			// Money collected is `amountPaid`; `amount` is only the checkout
			// attempt currently in flight.
			amountPaid: transactions.amountPaid,
			receipt: transactions.recieptLink
		})
		.from(orders)
		.innerJoin(orderItems, eq(orders.id, orderItems.orderId))
		.innerJoin(products, eq(orderItems.productId, products.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(currentMonthFilter(orders.createdAt, start, end))
		.orderBy(asc(orders.createdAt), asc(orders.id), asc(orderItems.id));

	const seenOrders = new Set<number>();
	const allReports = rows.map((row) => {
		// `order_items.amount` is a label (`qty-3`, a SKU, a basis), not money:
		// the line total is priced on the line's own basis, at the rate as it was
		// quoted (VAT-inclusive or not — see the VAT column).
		const priced = priceLine(
			{
				quantity: row.quantityPurchased,
				length: row.length != null ? Number(row.length) : null,
				width: row.width != null ? Number(row.width) : null,
				thickness: row.thickness != null ? Number(row.thickness) : null,
				weight: row.weight != null ? Number(row.weight) : null,
				basis: row.priceBasis as PricingBasis,
				unitPrice: Number(row.unitPrice ?? 0),
				priceIncludesVat: row.priceIncludesVat
			},
			0
		);

		// What was paid belongs to the order, not the line — show it once per
		// order so a column total doesn't count it once per line item.
		const firstLineOfOrder = !seenOrders.has(row.orderId);
		seenOrders.add(row.orderId);

		return {
			orderId: row.orderId,
			status: row.status,
			productName: row.productName,
			productId: row.productId,
			quantityPurchased: row.quantityPurchased,
			unitPrice: row.unitPrice,
			priceBasis: row.priceBasis,
			vat: row.priceIncludesVat ? 'Included' : 'Excluded',
			// With a 0% rate priceLine's net is exactly units × rate.
			lineTotal: row.unitPrice == null ? null : round2(priced.net),
			totalPaid: firstLineOfOrder ? Number(row.amountPaid ?? 0) : null,
			receipt: row.receipt
		};
	});

	return {
		allReports,
		start,
		end
	};
};
