import { db } from '$lib/server/db';
import {
	orders,
	transactions,
	customers,
	orderItems,
	products,
	colors,
	priceOffers,
	quoteRequests
} from '$lib/server/db/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { getAdjustedTotalsForOrders, type AdjustedTotals } from '$lib/server/orderAdjustments';
import { priceLine, type PricingBasis } from '$lib/server/pricing';
import { getSiteSettings } from '$lib/server/siteSettings';
import { vatRateOf } from '$lib/siteSettings';
import type { DbLike } from '$lib/server/stock';

export async function getOrderDetails(orderId: number) {
	const order = await db.select().from(orders).where(eq(orders.id, orderId)).then((r) => r[0]);
	if (!order) return null;

	const transaction = order.transactionId
		? await db
				.select()
				.from(transactions)
				.where(eq(transactions.id, order.transactionId))
				.then((r) => r[0])
		: undefined;

	const customer = order.customerId
		? await db.select().from(customers).where(eq(customers.id, order.customerId)).then((r) => r[0])
		: undefined;

	// The spec (colour/width/thickness/length) lives directly on orderItems now —
	// it's the customer's actual requested spec, not necessarily a catalog
	// variant's — so read it straight from the line item, only joining out to
	// colors for a display name.
	const items = await db
		.select({
			quantity: orderItems.quantity,
			price: orderItems.price,
			// The dimension the rate is charged against. Without it the email item
			// table could only ever assume "per piece", so a per-metre line's
			// figures did not reconcile with the offer totals printed beneath them.
			priceBasis: orderItems.priceBasis,
			priceIncludesVat: orderItems.priceIncludesVat,
			variantId: orderItems.variantId,
			productName: products.name,
			colorName: colors.name,
			width: orderItems.width,
			widthUnit: orderItems.widthUnit,
			thickness: orderItems.thickness,
			thicknessUnit: orderItems.thicknessUnit,
			length: orderItems.length,
			lengthUnit: orderItems.lengthUnit
		})
		.from(orderItems)
		.leftJoin(products, eq(products.id, orderItems.productId))
		.leftJoin(colors, eq(colors.id, orderItems.colorId))
		.where(eq(orderItems.orderId, order.id));

	// Most recent price offer for this order — carries the VAT/withholding/total
	// breakdown and the advance-payment terms. May be absent for orders that
	// haven't been through the quote-builder (e.g. a direct retail checkout).
	const offer = await db
		.select()
		.from(priceOffers)
		.where(eq(priceOffers.orderId, order.id))
		.orderBy(desc(priceOffers.revision))
		.limit(1)
		.then((r) => r[0]);

	return { order, transaction, customer, items, offer };
}

export type OrderTotal = {
	/** What the customer owes in full: VAT, discounts and approved adjustments included. */
	total: number;
	/** The offer breakdown when the order was priced in the quote builder. */
	adjusted: AdjustedTotals | null;
	/** Staff-created orders have no offer; their total comes from the lines. */
	hasOffer: boolean;
	/** A line with no price contributes 0 — the total is then not a real bill. */
	hasUnpricedLines: boolean;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * The payable total for many orders at once.
 *
 * An order priced in the quote builder is billed on its latest offer plus
 * approved adjustments (the same figure /pay charges). An order staff created
 * directly on the Orders page has no offer, so its total is its lines priced
 * basis-aware (pricing.ts) at the current VAT rate. `SUM(quantity * price)`
 * — what the orders list used to show — ignored both the basis and VAT.
 */
export async function getOrderTotals(
	orderIds: number[],
	tx: DbLike = db
): Promise<Map<number, OrderTotal>> {
	const ids = [...new Set(orderIds)].filter((id) => Number.isInteger(id) && id > 0);
	const result = new Map<number, OrderTotal>();
	if (ids.length === 0) return result;

	const [adjustedByOrder, lines] = await Promise.all([
		getAdjustedTotalsForOrders(ids, tx),
		tx
			.select({
				orderId: orderItems.orderId,
				quantity: orderItems.quantity,
				price: orderItems.price,
				priceBasis: orderItems.priceBasis,
				priceIncludesVat: orderItems.priceIncludesVat,
				length: orderItems.length,
				width: orderItems.width,
				thickness: orderItems.thickness,
				weight: orderItems.weight
			})
			.from(orderItems)
			.where(inArray(orderItems.orderId, ids))
	]);

	const needsLines = ids.some((id) => !adjustedByOrder.has(id));
	const vatRate = needsLines ? vatRateOf(await getSiteSettings()) : 0;

	const lineTotals = new Map<number, { gross: number; unpriced: boolean }>();
	for (const line of lines) {
		if (line.orderId == null) continue;
		const entry = lineTotals.get(line.orderId) ?? { gross: 0, unpriced: false };
		if (line.price == null) {
			entry.unpriced = true;
		} else {
			entry.gross += priceLine(
				{
					quantity: line.quantity,
					length: line.length == null ? null : Number(line.length),
					width: line.width == null ? null : Number(line.width),
					thickness: line.thickness == null ? null : Number(line.thickness),
					weight: line.weight == null ? null : Number(line.weight),
					basis: line.priceBasis as PricingBasis,
					unitPrice: Number(line.price),
					priceIncludesVat: line.priceIncludesVat
				},
				vatRate
			).gross;
		}
		lineTotals.set(line.orderId, entry);
	}

	for (const id of ids) {
		const adjusted = adjustedByOrder.get(id) ?? null;
		const fromLines = lineTotals.get(id);
		result.set(id, {
			total: adjusted ? adjusted.total : round2(fromLines?.gross ?? 0),
			adjusted,
			hasOffer: adjusted != null,
			hasUnpricedLines: fromLines?.unpriced ?? false
		});
	}
	return result;
}

export async function getOrderTotal(orderId: number, tx: DbLike = db): Promise<OrderTotal> {
	return (
		(await getOrderTotals([orderId], tx)).get(orderId) ?? {
			total: 0,
			adjusted: null,
			hasOffer: false,
			hasUnpricedLines: false
		}
	);
}

/** The quote request each order came from, if any (orderId → quote request id). */
export async function getQuoteIdsForOrders(orderIds: number[], tx: DbLike = db) {
	const map = new Map<number, number>();
	const ids = [...new Set(orderIds)].filter((id) => Number.isInteger(id) && id > 0);
	if (ids.length === 0) return map;

	const rows = await tx
		.select({ id: quoteRequests.id, orderId: quoteRequests.orderId })
		.from(quoteRequests)
		.where(inArray(quoteRequests.orderId, ids))
		.orderBy(desc(quoteRequests.id));
	for (const row of rows) {
		if (row.orderId != null && !map.has(row.orderId)) map.set(row.orderId, row.id);
	}
	return map;
}
