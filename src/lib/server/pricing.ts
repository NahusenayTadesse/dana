// Whole-order price calculation. An order's price offer is built from its
// orderItems lines — each line already carries its own resolved unit rate
// (from variantPrices, or a manual override), the dimension that rate is
// priced against (priceBasis), and whether that rate already includes VAT.
// This intentionally lives server-side only: it's re-run every time a quote
// is (re)priced, never trusted from the client.

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

import { VAT_RATE } from '$lib/vat';

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

export function priceLine(line: PricingLineInput): PricedLine {
	const units = unitsFor(line);
	const raw = units * line.unitPrice;
	// A rate that already includes VAT is never taxed again — its net
	// equivalent is only backed out for the subtotal figure.
	const gross = line.priceIncludesVat ? raw : raw * (1 + VAT_RATE / 100);
	const net = line.priceIncludesVat ? raw / (1 + VAT_RATE / 100) : raw;
	return { ...line, units, net, gross };
}

export type OrderPricingInput = {
	lines: PricingLineInput[];
	discountPercentage?: number | null;
	vatRate?: number; // defaults to 15
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
	vatRate = VAT_RATE,
	withholdingRate = WITHHOLDING_RATE
}: OrderPricingInput): OrderPricingResult {
	const priced = lines.map(priceLine);

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

function round2(n: number): number {
	return Math.round((n + Number.EPSILON) * 100) / 100;
}
