// Single source of truth for VAT arithmetic, shared by client and server.
//
// A line's rate may be quoted either VAT-inclusive or VAT-exclusive
// (variantPrices.priceIncludesVat), so "add 15%" is only correct for half the
// rows. Splitting a unit rate into its net and VAT parts was being reimplemented
// per surface — the cart drawer, the checkout summary, and pricing.ts — and the
// cart's version simply ignored the flag and summed the two kinds together.
//
// The rate is a REQUIRED argument rather than a module constant with a default.
// It is admin-editable now (Business Settings → VAT rate), and a default would
// let one surface quietly keep using 15% while the rest moved — which on money
// is not a cosmetic bug. Making it required means the compiler names every
// place that has to be told.

/** What the site ships with, and the fallback when no setting is stored. */
export const DEFAULT_VAT_RATE = 15;

const multiplier = (rate: number) => 1 + rate / 100;

/** VAT-exclusive value of a unit rate. */
export function netOf(unitPrice: number, priceIncludesVat: boolean, rate: number): number {
	return priceIncludesVat ? unitPrice / multiplier(rate) : unitPrice;
}

/** VAT-inclusive value of a unit rate. */
export function grossOf(unitPrice: number, priceIncludesVat: boolean, rate: number): number {
	return priceIncludesVat ? unitPrice : unitPrice * multiplier(rate);
}

/** The VAT component of a unit rate. */
export function vatOf(unitPrice: number, priceIncludesVat: boolean, rate: number): number {
	return grossOf(unitPrice, priceIncludesVat, rate) - netOf(unitPrice, priceIncludesVat, rate);
}

export function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Reads the stored rate, falling back to the shipped one if it is unusable. */
export function parseVatRate(value: string | undefined | null): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : DEFAULT_VAT_RATE;
}
