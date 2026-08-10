// Single source of truth for VAT arithmetic, shared by client and server.
//
// A line's rate may be quoted either VAT-inclusive or VAT-exclusive
// (variantPrices.priceIncludesVat), so "add 15%" is only correct for half the
// rows. Splitting a unit rate into its net and VAT parts was being reimplemented
// per surface — the cart drawer, the checkout summary, and pricing.ts — and the
// cart's version simply ignored the flag and summed the two kinds together.

export const VAT_RATE = 15;

const VAT_MULTIPLIER = 1 + VAT_RATE / 100;

/** VAT-exclusive value of a unit rate. */
export function netOf(unitPrice: number, priceIncludesVat: boolean): number {
	return priceIncludesVat ? unitPrice / VAT_MULTIPLIER : unitPrice;
}

/** VAT-inclusive value of a unit rate. */
export function grossOf(unitPrice: number, priceIncludesVat: boolean): number {
	return priceIncludesVat ? unitPrice : unitPrice * VAT_MULTIPLIER;
}

/** The VAT component of a unit rate. */
export function vatOf(unitPrice: number, priceIncludesVat: boolean): number {
	return grossOf(unitPrice, priceIncludesVat) - netOf(unitPrice, priceIncludesVat);
}

export function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
