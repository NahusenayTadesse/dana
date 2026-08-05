import { db } from '$lib/server/db';
import { orderAdjustments, priceOffers } from '$lib/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

export async function getNetApprovedAdjustment(orderId: number): Promise<number> {
	const rows = await db
		.select()
		.from(orderAdjustments)
		.where(and(eq(orderAdjustments.orderId, orderId), eq(orderAdjustments.status, 'approved')));

	return rows.reduce((sum, row) => sum + (row.type === 'addition' ? 1 : -1) * Number(row.amount), 0);
}

/**
 * The accepted offer's breakdown, with every approved adjustment folded in.
 * The adjustment is treated as a VAT-exclusive change to the underlying
 * price (the same tax treatment as the rest of the order), so VAT and
 * withholding are recomputed on the adjusted base rather than just tacked
 * onto the final total.
 */
export async function getAdjustedOrderTotals(orderId: number): Promise<AdjustedTotals | null> {
	const offer = await db
		.select()
		.from(priceOffers)
		.where(eq(priceOffers.orderId, orderId))
		.orderBy(desc(priceOffers.revision))
		.limit(1)
		.then((rows) => rows[0]);

	if (!offer) return null;

	const netAdjustment = await getNetApprovedAdjustment(orderId);

	const vatRate = Number(offer.vatRate);
	const withholdingRate = Number(offer.withholdingRate ?? 0);

	const priceExcludingVat = round2(Number(offer.priceExcludingVat) + netAdjustment);
	const vatAmount = round2(priceExcludingVat * (vatRate / 100));
	const priceIncludingVat = round2(priceExcludingVat + vatAmount);
	const withholdingAmount = round2(priceExcludingVat * (withholdingRate / 100));
	const total = round2(priceIncludingVat - withholdingAmount);

	return {
		subtotal: round2(Number(offer.subtotal) + netAdjustment),
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

function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
