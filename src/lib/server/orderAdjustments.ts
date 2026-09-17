import { db } from '$lib/server/db';
import { orderAdjustments, priceOffers } from '$lib/server/db/schema';
import { eq, and, desc, inArray } from 'drizzle-orm';
import type { DbLike } from '$lib/server/stock';

// An order's TRUE current total is never just the accepted price offer's
// total in isolation — every approved adjustment (a post-dispatch correction,
// see schema.ts) shifts it. This is the one place that combines the two, so
// the payment page, balance-payment emails, and the dashboard adjustment
// dialog all agree on the same number.

export type AdjustedTotals = {
	subtotal: number;
	discountAmount: number;
	priceExcludingVat: number;
	vatRate: number;
	vatAmount: number;
	priceIncludingVat: number;
	withholdingRate: number;
	withholdingAmount: number;
	total: number;
	netAdjustment: number; // positive = customer owes more, negative = owed a refund
};

type Offer = typeof priceOffers.$inferSelect;

const signed = (row: { type: 'addition' | 'deduction'; amount: string }) =>
	(row.type === 'addition' ? 1 : -1) * Number(row.amount);

export async function getNetApprovedAdjustment(orderId: number, tx: DbLike = db): Promise<number> {
	const rows = await tx
		.select({ type: orderAdjustments.type, amount: orderAdjustments.amount })
		.from(orderAdjustments)
		.where(and(eq(orderAdjustments.orderId, orderId), eq(orderAdjustments.status, 'approved')));

	return round2(rows.reduce((sum, row) => sum + signed(row), 0));
}

/**
 * The offer's own breakdown with a net adjustment folded in.
 *
 * The offer's stored figures are the starting point, not a recomputation: its
 * `vatAmount` is already correct for a mix of VAT-inclusive and VAT-exclusive
 * lines (pricing.ts derives it as gross − net), and re-taxing `priceExcludingVat`
 * at the flat rate gave a different total than the offer even with no
 * adjustments at all. The adjustment itself is a VAT-exclusive change, so only
 * the adjustment is taxed at the flat rate; withholding is recomputed on the
 * adjusted base exactly as pricing.ts computes it.
 */
export function adjustOfferTotals(offer: Offer, netAdjustment: number): AdjustedTotals {
	const vatRate = Number(offer.vatRate);
	const withholdingRate = Number(offer.withholdingRate ?? 0);

	// A deduction can never take the order below zero — the actions refuse
	// that, and this keeps any legacy row from producing a negative bill.
	const priceExcludingVat = Math.max(0, round2(Number(offer.priceExcludingVat) + netAdjustment));
	const appliedAdjustment = round2(priceExcludingVat - Number(offer.priceExcludingVat));
	const vatAmount = Math.max(0, round2(Number(offer.vatAmount) + appliedAdjustment * (vatRate / 100)));
	const priceIncludingVat = round2(priceExcludingVat + vatAmount);
	const withholdingAmount = round2(priceExcludingVat * (withholdingRate / 100));
	const total = Math.max(0, round2(priceIncludingVat - withholdingAmount));

	return {
		// subtotal − discountAmount === priceExcludingVat, so the breakdown adds up.
		subtotal: round2(Number(offer.subtotal) + appliedAdjustment),
		discountAmount: Number(offer.discountAmount ?? 0),
		priceExcludingVat,
		vatRate,
		vatAmount,
		priceIncludingVat,
		withholdingRate,
		withholdingAmount,
		total,
		netAdjustment
	};
}

/**
 * Adjusted totals for many orders in two queries (latest offer revision per
 * order + their approved adjustments). Orders with no offer are absent from
 * the map.
 */
export async function getAdjustedTotalsForOrders(
	orderIds: number[],
	tx: DbLike = db
): Promise<Map<number, AdjustedTotals>> {
	const ids = [...new Set(orderIds)].filter((id) => Number.isInteger(id) && id > 0);
	const result = new Map<number, AdjustedTotals>();
	if (ids.length === 0) return result;

	const [offers, adjustments] = await Promise.all([
		tx
			.select()
			.from(priceOffers)
			.where(inArray(priceOffers.orderId, ids))
			.orderBy(priceOffers.orderId, desc(priceOffers.revision)),
		tx
			.select({
				orderId: orderAdjustments.orderId,
				type: orderAdjustments.type,
				amount: orderAdjustments.amount
			})
			.from(orderAdjustments)
			.where(and(inArray(orderAdjustments.orderId, ids), eq(orderAdjustments.status, 'approved')))
	]);

	const latestOffer = new Map<number, Offer>();
	for (const offer of offers) {
		// Ordered by revision desc within each order, so the first one wins.
		if (!latestOffer.has(offer.orderId)) latestOffer.set(offer.orderId, offer);
	}

	const net = new Map<number, number>();
	for (const row of adjustments) {
		net.set(row.orderId, (net.get(row.orderId) ?? 0) + signed(row));
	}

	for (const [orderId, offer] of latestOffer) {
		result.set(orderId, adjustOfferTotals(offer, round2(net.get(orderId) ?? 0)));
	}
	return result;
}

/**
 * The latest offer's breakdown, with every approved adjustment folded in.
 * Null when the order has no price offer.
 */
export async function getAdjustedOrderTotals(
	orderId: number,
	tx: DbLike = db
): Promise<AdjustedTotals | null> {
	return (await getAdjustedTotalsForOrders([orderId], tx)).get(orderId) ?? null;
}

function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
