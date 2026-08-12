// Turns resolved cart lines into the same order summary the customer just
// looked at on /buy and /checkout, so the confirmation email and SMS restate
// the order instead of a one-line "Product A (spec) ×3, Product B ..." blob.
//
// Everything here is derived from `ResolvedLine`s — i.e. from prices and specs
// the server read back out of the catalog (see orderLines.ts) — never from
// figures the browser sent. That is the whole reason the email can quote money
// at all.
//
// Two tables come out of this, mirroring the two on the page:
//   - `lines`       — one row per order line, the cutting manifest (a variant
//                     ordered at three lengths is three rows).
//   - `productRows` — the per-product roll-up (OrderProductSummary.svelte):
//                     lengths collapsed into one quantity + one total length.

import { inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, colors } from '$lib/server/db/schema';
import { priceLine, type PricingBasis } from '$lib/server/pricing';
import type { ResolvedLine } from '$lib/server/orderLines';

export type OrderSummaryLine = {
	productId: number;
	productName: string;
	/** "Signal Red · 1000mm · 0.45mm · 3m", or '' when the line carries no spec. */
	spec: string;
	quantity: number;
	/** null for a quote-only line — staff price those in the quote builder. */
	unitPrice: number | null;
	priceBasis: PricingBasis;
	priceIncludesVat: boolean;
	/** What `unitPrice` multiplies against: pieces, metres, m², ... */
	units: number;
	/** Kept alongside `spec` so a per-length rate can be labelled in its own unit. */
	lengthUnit: string | null;
	/** VAT-exclusive / VAT-inclusive line amounts. Both 0 on an unpriced line. */
	net: number;
	gross: number;
	isPriced: boolean;
};

/** Length totals are kept per unit — adding metres to millimetres means nothing. */
export type UnitTotal = { unit: string; total: number };

export type OrderSummaryProductRow = {
	productId: number;
	productName: string;
	/** How many separate order lines (lengths/colours) this product arrived as. */
	lines: number;
	quantity: number;
	byUnit: UnitTotal[];
};

export type OrderSummary = {
	lines: OrderSummaryLine[];
	productRows: OrderSummaryProductRow[];
	/** Total pieces across the order. */
	totalQuantity: number;
	totalByUnit: UnitTotal[];
	subtotalExclVat: number;
	vatTotal: number;
	grandTotal: number;
	hasPricedLines: boolean;
	hasUnpricedLines: boolean;
	/** The old flat one-liner — still used for subjects and short contexts. */
	itemLabel: string;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** 'gauge' reads as a word in a spec string; everywhere else the unit is a suffix. */
const unitSuffix = (unit: string | null | undefined) => (unit === 'gauge' ? 'ga' : (unit ?? ''));

function addLength(into: UnitTotal[], length: number, unit: string) {
	const entry = into.find((u) => u.unit === unit);
	if (entry) entry.total += length;
	else into.push({ unit, total: length });
}

/** "12 m + 400 mm" — matches OrderProductSummary's lengthText(). */
export function formatLengthTotals(byUnit: UnitTotal[]): string {
	if (byUnit.length === 0) return '—';
	return byUnit
		.map((u) => `${Number(u.total.toFixed(2)).toLocaleString()}${u.unit ? ` ${u.unit}` : ''}`)
		.join(' + ');
}

/** "per piece" / "per m" — so a unit price on a length-priced line isn't read as a piece price. */
export function basisLabel(basis: PricingBasis, lengthUnit?: string | null): string {
	switch (basis) {
		case 'length':
			return `per ${unitSuffix(lengthUnit) || 'm'}`;
		case 'area':
			return 'per m²';
		case 'weight':
			return 'per kg';
		case 'width':
			return 'per width unit';
		case 'thickness':
			return 'per thickness unit';
		default:
			return 'per piece';
	}
}

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Build the summary for a set of resolved lines.
 *
 * Line money is basis-aware (via pricing.ts `priceLine`), so a length-priced
 * sheet is costed as rate × length × pieces — the same arithmetic the quote
 * builder will run when staff price this order. Unpriced lines contribute
 * nothing to the totals and are flagged through `hasUnpricedLines` so callers
 * can label the figure a partial estimate rather than a bill.
 */
export async function buildOrderSummary(
	resolved: ResolvedLine[],
	tx: DbLike = db
): Promise<OrderSummary> {
	const productIds = [...new Set(resolved.map((l) => l.productId))];
	const colorIds = [
		...new Set(resolved.map((l) => l.colorId).filter((id): id is number => id != null))
	];

	const [productRowsDb, colorRowsDb] = await Promise.all([
		productIds.length
			? tx
					.select({ id: products.id, name: products.name })
					.from(products)
					.where(inArray(products.id, productIds))
			: Promise.resolve([]),
		colorIds.length
			? tx
					.select({ id: colors.id, name: colors.name })
					.from(colors)
					.where(inArray(colors.id, colorIds))
			: Promise.resolve([])
	]);

	const productNames = new Map(productRowsDb.map((p) => [p.id, p.name]));
	const colorNames = new Map(colorRowsDb.map((c) => [c.id, c.name]));

	const lines: OrderSummaryLine[] = resolved.map((line) => {
		const productName = productNames.get(line.productId) ?? `Product #${line.productId}`;

		const specParts: string[] = [];
		const colorName = line.colorId != null ? colorNames.get(line.colorId) : null;
		if (colorName) specParts.push(colorName);
		if (line.width != null) specParts.push(`${Number(line.width)}${unitSuffix(line.widthUnit)}`);
		if (line.thickness != null)
			specParts.push(`${Number(line.thickness)}${unitSuffix(line.thicknessUnit)}`);
		if (line.length != null) specParts.push(`${Number(line.length)}${unitSuffix(line.lengthUnit)}`);

		const unitPrice = line.price == null ? null : Number(line.price);
		const isPriced = unitPrice != null && Number.isFinite(unitPrice);

		const priced = priceLine({
			quantity: line.quantity,
			length: line.length == null ? null : Number(line.length),
			width: line.width == null ? null : Number(line.width),
			thickness: line.thickness == null ? null : Number(line.thickness),
			basis: line.priceBasis,
			unitPrice: isPriced ? unitPrice : 0,
			priceIncludesVat: line.priceIncludesVat
		});

		return {
			productId: line.productId,
			productName,
			spec: specParts.join(' · '),
			quantity: line.quantity,
			unitPrice: isPriced ? unitPrice : null,
			priceBasis: line.priceBasis,
			priceIncludesVat: line.priceIncludesVat,
			units: priced.units,
			lengthUnit: unitSuffix(line.lengthUnit) || null,
			net: isPriced ? round2(priced.net) : 0,
			gross: isPriced ? round2(priced.gross) : 0,
			isPriced
		};
	});

	// --- per-product roll-up (the second table on /buy and /checkout) ---
	const productRows: OrderSummaryProductRow[] = [];
	for (let i = 0; i < resolved.length; i++) {
		const line = resolved[i];
		let row = productRows.find((r) => r.productId === line.productId);
		if (!row) {
			row = {
				productId: line.productId,
				productName: lines[i].productName,
				lines: 0,
				quantity: 0,
				byUnit: []
			};
			productRows.push(row);
		}
		row.lines += 1;
		row.quantity += line.quantity;
		// Material, not row count: 4 sheets at 3m is 12m to cut.
		if (line.length != null) {
			addLength(row.byUnit, Number(line.length) * line.quantity, unitSuffix(line.lengthUnit));
		}
	}

	const totalByUnit: UnitTotal[] = [];
	for (const r of productRows) for (const u of r.byUnit) addLength(totalByUnit, u.total, u.unit);

	const subtotalExclVat = round2(lines.reduce((sum, l) => sum + l.net, 0));
	const grandTotal = round2(lines.reduce((sum, l) => sum + l.gross, 0));

	return {
		lines,
		productRows,
		totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
		totalByUnit,
		subtotalExclVat,
		vatTotal: round2(grandTotal - subtotalExclVat),
		grandTotal,
		hasPricedLines: lines.some((l) => l.isPriced),
		hasUnpricedLines: lines.some((l) => !l.isPriced),
		itemLabel: lines
			.map((l) => `${l.productName}${l.spec ? ` (${l.spec})` : ''} ×${l.quantity}`)
			.join(', ')
	};
}
