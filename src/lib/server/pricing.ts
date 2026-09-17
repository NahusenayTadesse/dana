// Whole-order price calculation. An order's price offer is built from its
// orderItems lines — each line already carries its own resolved unit rate
// (from variantPrices, or a manual override), the dimension that rate is
// priced against (priceBasis), and whether that rate already includes VAT.
// This intentionally lives server-side only: it's re-run every time a quote
// is (re)priced, never trusted from the client.
//
// Product discounts (the `discounts` table — a percentage per product) are
// applied earlier, when a cart line is resolved (see orderLines.ts), so the
// line rates arriving here are already discounted.

export type PricingBasis =
	| 'quantity'
	| 'length'
	| 'width'
	| 'thickness'
	| 'color'
	| 'weight'
	| 'area';

export type PricingLineInput = {
	quantity?: number | null;
	length?: number | null;
	width?: number | null;
	thickness?: number | null;
	weight?: number | null;
	basis: PricingBasis;
	unitPrice: number;
	priceIncludesVat: boolean;
};

export type PricedLine = PricingLineInput & {
	units: number; // the multiplier `unitPrice` is applied against
	net: number; // VAT-exclusive amount for this line
	gross: number; // VAT-inclusive amount for this line
};

import { DEFAULT_VAT_RATE } from '$lib/vat';

const WITHHOLDING_RATE = 3;

/** How many "units" of the basis this line represents — what unitPrice multiplies against. */
function unitsFor(line: PricingLineInput): number {
	const qty = line.quantity ?? 1;
	switch (line.basis) {
		case 'quantity':
		case 'color':
			return qty;
		case 'length':
			return (line.length ?? 0) * qty;
		case 'width':
			return (line.width ?? 0) * qty;
		case 'thickness':
			return (line.thickness ?? 0) * qty;
		case 'weight':
			return (line.weight ?? 0) * qty;
		case 'area':
			return (line.width ?? 0) * (line.length ?? 0) * qty;
		default:
			return qty;
	}
}

export function priceLine(line: PricingLineInput, vatRate: number): PricedLine {
	const units = unitsFor(line);
	const raw = units * line.unitPrice;
	// A rate that already includes VAT is never taxed again — its net
	// equivalent is only backed out for the subtotal figure.
	const gross = line.priceIncludesVat ? raw : raw * (1 + vatRate / 100);
	const net = line.priceIncludesVat ? raw / (1 + vatRate / 100) : raw;
	return { ...line, units, net, gross };
}

export type OrderPricingInput = {
	lines: PricingLineInput[];
	discountPercentage?: number | null;
	vatRate?: number; // defaults to the shipped rate
	withholdingRate?: number; // defaults to 3
};

export type OrderPricingResult = {
	lines: PricedLine[];
	subtotal: number; // sum of net, before discount
	discountPercentage: number;
	discountAmount: number; // off subtotal
	priceExcludingVat: number; // subtotal - discountAmount
	vatRate: number;
	vatAmount: number;
	priceIncludingVat: number; // priceExcludingVat + vatAmount
	withholdingRate: number;
	withholdingAmount: number; // off priceExcludingVat
	total: number; // priceIncludingVat - withholdingAmount
};

export function calculateOrderPricing({
	lines,
	discountPercentage = 0,
	vatRate = DEFAULT_VAT_RATE,
	withholdingRate = WITHHOLDING_RATE
}: OrderPricingInput): OrderPricingResult {
	const priced = lines.map((line) => priceLine(line, vatRate));

	const subtotal = round2(priced.reduce((sum, l) => sum + l.net, 0));
	const grossSubtotal = round2(priced.reduce((sum, l) => sum + l.gross, 0));

	// A discount was previously used unclamped: 150 produced a negative total,
	// and a negative value silently marked the price UP.
	const safeDiscount = Math.min(100, Math.max(0, discountPercentage ?? 0));
	const discountFraction = safeDiscount / 100;
	const discountAmount = round2(subtotal * discountFraction);
	const priceExcludingVat = round2(subtotal - discountAmount);
	const priceIncludingVat = round2(grossSubtotal * (1 - discountFraction));
	const vatAmount = round2(priceIncludingVat - priceExcludingVat);

	const withholdingAmount = round2(priceExcludingVat * (withholdingRate / 100));
	const total = round2(priceIncludingVat - withholdingAmount);

	return {
		lines: priced,
		subtotal,
		discountPercentage: safeDiscount,
		discountAmount,
		priceExcludingVat,
		vatRate,
		vatAmount,
		priceIncludingVat,
		withholdingRate,
		withholdingAmount,
		total
	};
}

/** Clamp a stored discount to a usable percentage (0–100); junk becomes 0. */
export function clampPercentage(value: unknown): number {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.min(100, Math.max(0, n));
}

/**
 * A unit price after a product discount (`discounts.amount`, a percentage),
 * rounded to cents. Used when a cart line is resolved, so the discounted rate
 * is what gets stored on the order line and every total built from it.
 */
export function applyPercentDiscount(unitPrice: number, percentage: number | null | undefined): number {
	const pct = clampPercentage(percentage ?? 0);
	if (pct === 0) return unitPrice;
	return round2(unitPrice * (1 - pct / 100));
}

function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
