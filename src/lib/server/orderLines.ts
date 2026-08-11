// Server-side resolution of an incoming cart into order line items.
//
// SECURITY: the browser sends only *what* it wants (product, variant, piece
// count) and — for off-catalog custom quotes — the spec it is asking us to
// quote. It never gets to say what anything COSTS. Every priced field on the
// resulting orderItems row (price, priceBasis, priceIncludesVat) is read back
// out of the database here, and a variant-backed line has its spec read from
// the variant too, so a crafted POST cannot mispriced itself or graft another
// product's variant onto a cheaper product.
//
// This is the boundary `pricing.ts` assumes when it says line rates are
// "never trusted from the client" — it is only true because of this module.

import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	products,
	productVariants,
	variantPrices,
	widths,
	thicknesses,
	lengths
} from '$lib/server/db/schema';
import type { PricingBasis } from '$lib/server/pricing';

/** What the client is allowed to ask for. Note the absence of any price field. */
export type RequestedLine = {
	product: number;
	variantId?: number | null;
	quantity: number;
	amount?: string | null;
	// Only honoured for custom (non-variant) lines — a variant-backed line takes
	// its spec from the variant record instead.
	colorId?: number | null;
	width?: number | null;
	widthUnit?: 'mm' | 'cm' | 'm' | 'in' | 'ft' | null;
	thickness?: number | null;
	thicknessUnit?: 'mm' | 'gauge' | null;
	length?: number | null;
	lengthUnit?: 'mm' | 'm' | 'ft' | null;
};

/** Exactly the shape an `orderItems` insert takes. */
export type ResolvedLine = {
	productId: number;
	variantId: number | null;
	quantity: number;
	amount: string;
	price: string | null;
	priceBasis: PricingBasis;
	priceIncludesVat: boolean;
	colorId: number | null;
	width: string | null;
	widthUnit: 'mm' | 'cm' | 'm' | 'in' | 'ft' | undefined;
	thickness: string | null;
	thicknessUnit: 'mm' | 'gauge' | undefined;
	length: string | null;
	lengthUnit: 'mm' | 'm' | 'ft' | undefined;
};

export class OrderLineError extends Error {}

/**
 * Which rate a product sells on, most specific first. `variantPrices` may carry
 * several bases for one variant (per piece AND per meter); products.soldBy says
 * which one this product actually transacts on.
 */
function basisPreference(soldBy: 'quantity' | 'length' | 'both'): PricingBasis[] {
	switch (soldBy) {
		case 'length':
			return ['length', 'area', 'quantity'];
		case 'both':
			// N pieces each of length X — the length rate is the meaningful one,
			// with the piece rate as the fallback.
			return ['length', 'area', 'quantity'];
		case 'quantity':
		default:
			return ['quantity', 'area', 'length'];
	}
}

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * A cut-to-order length the customer asked for on a variant-backed line, or
 * null to fall back to the variant's own catalog length.
 *
 * The cart keys its lines by variant AND length, so one variant can arrive as
 * several lines at different lengths — 3 sheets at 2m and 2 at 3.5m. Taking
 * the spec purely from the variant would flatten those back into identical
 * order items, which is exactly what the customer did not order.
 *
 * SECURITY: length is a price multiplier whenever the resolved rate is charged
 * per length or per area (see pricing.ts unitsFor), so a free-text length from
 * the browser is a way to underpay. It is honoured only when the admin marked
 * the product cut-to-order, and only inside the [minLength, maxLength] window
 * they configured — the floor is what stops a "0.01m" line. Anything outside
 * that is ignored in favour of the variant's length rather than rejected, so a
 * stale cart can't hard-fail a checkout.
 */
function requestedLengthFor(
	product: { isLengthCustomizable: boolean; minLength: string | null; maxLength: string | null },
	line: RequestedLine
): number | null {
	if (!product.isLengthCustomizable) return null;

	const requested = line.length == null ? NaN : Number(line.length);
	if (!Number.isFinite(requested) || requested <= 0) return null;

	const floor = product.minLength != null ? Number(product.minLength) : null;
	const ceiling = product.maxLength != null ? Number(product.maxLength) : null;

	if (floor != null && requested < floor) return null;
	if (ceiling != null && requested > ceiling) return null;

	return requested;
}

/**
 * Turn client-requested cart lines into insert-ready order items, with every
 * priced field resolved from the database.
 *
 * Lines with no resolvable rate come back with `price: null` — that is a
 * legitimate quote-only outcome, not an error. Staff price those in the quote
 * builder, which is also the only path that may set a price.
 *
 * @throws {OrderLineError} if a product or variant is unknown, inactive, or if
 *         a variant does not belong to the product it was submitted under.
 */
export async function resolveOrderLines(
	requested: RequestedLine[],
	tx: DbLike = db
): Promise<ResolvedLine[]> {
	if (requested.length === 0) {
		throw new OrderLineError('Add at least one product before requesting a quote.');
	}

	const productIds = [...new Set(requested.map((l) => Number(l.product)))];
	if (productIds.some((id) => !Number.isInteger(id) || id <= 0)) {
		throw new OrderLineError('Invalid product in your cart — please refresh and try again.');
	}

	const productRows = await tx
		.select({
			id: products.id,
			name: products.name,
			soldBy: products.soldBy,
			// Needed to decide whether a client-requested length on a
			// variant-backed line may override the variant's own — see
			// requestedLengthFor() below.
			isLengthCustomizable: products.isLengthCustomizable,
			minLength: products.minLength,
			maxLength: products.maxLength,
			maxLengthUnit: products.maxLengthUnit
		})
		.from(products)
		.where(and(inArray(products.id, productIds), eq(products.isActive, true)));

	const productMap = new Map(productRows.map((p) => [p.id, p]));

	const missingProduct = productIds.find((id) => !productMap.has(id));
	if (missingProduct !== undefined) {
		throw new OrderLineError(
			`A product in your cart is no longer available — please refresh your cart.`
		);
	}

	// --- variants, with their catalog spec joined out ------------------------
	const variantIds = [
		...new Set(
			requested
				.map((l) => (l.variantId == null ? null : Number(l.variantId)))
				.filter((id): id is number => id !== null && Number.isInteger(id) && id > 0)
		)
	];

	const variantRows = variantIds.length
		? await tx
				.select({
					id: productVariants.id,
					productId: productVariants.productId,
					price: productVariants.price,
					colorId: productVariants.colorId,
					widthValue: widths.value,
					widthUnit: widths.unit,
					thicknessValue: thicknesses.value,
					thicknessUnit: thicknesses.unit,
					lengthValue: lengths.value,
					lengthUnit: lengths.unit
				})
				.from(productVariants)
				.leftJoin(widths, eq(widths.id, productVariants.widthId))
				.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
				.leftJoin(lengths, eq(lengths.id, productVariants.lengthId))
				.where(and(inArray(productVariants.id, variantIds), eq(productVariants.isActive, true)))
		: [];

	const variantMap = new Map(variantRows.map((v) => [v.id, v]));

	// --- the price book for those variants -----------------------------------
	const rateRows = variantIds.length
		? await tx
				.select({
					variantId: variantPrices.variantId,
					basis: variantPrices.basis,
					price: variantPrices.price,
					priceIncludesVat: variantPrices.priceIncludesVat
				})
				.from(variantPrices)
				.where(inArray(variantPrices.variantId, variantIds))
		: [];

	const ratesByVariant = new Map<number, typeof rateRows>();
	for (const rate of rateRows) {
		const list = ratesByVariant.get(rate.variantId) ?? [];
		list.push(rate);
		ratesByVariant.set(rate.variantId, list);
	}

	return requested.map((line) => {
		const productId = Number(line.product);
		const product = productMap.get(productId)!;

		const quantity = Number(line.quantity);
		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw new OrderLineError('Every cart line needs a whole quantity of at least 1.');
		}

		const variantId = line.variantId == null ? null : Number(line.variantId);
		const variant = variantId == null ? undefined : variantMap.get(variantId);

		if (variantId != null && !variant) {
			throw new OrderLineError(
				'A selected product option is no longer available — please refresh your cart.'
			);
		}

		// Cross-product variant injection: a variant of an expensive product
		// submitted under a cheap product's id, to inherit the cheap rate.
		if (variant && variant.productId !== productId) {
			throw new OrderLineError('Cart contains a product option that does not match its product.');
		}

		// --- price: DB only, never the request -------------------------------
		let price: string | null = null;
		let priceBasis: PricingBasis = 'quantity';
		let priceIncludesVat = false;

		if (variant) {
			const rates = ratesByVariant.get(variant.id) ?? [];
			const preferred = basisPreference(product.soldBy);
			const rate =
				preferred.map((b) => rates.find((r) => r.basis === b)).find((r) => r !== undefined) ??
				rates[0];

			if (rate) {
				price = rate.price;
				priceBasis = rate.basis as PricingBasis;
				priceIncludesVat = rate.priceIncludesVat;
			} else if (variant.price != null) {
				// No entry in the rate book — fall back to the variant's flat
				// retail price, which is a per-piece figure by definition.
				price = variant.price;
				priceBasis = 'quantity';
				priceIncludesVat = false;
			}
			// else: quote-only variant. price stays null; staff will price it.
		}

		// --- spec: from the variant when there is one, else the request ------
		// A custom line's spec IS the customer's ask (that is the whole point of
		// a quote request), so it is carried through as submitted — it is
		// unpriced above, and staff review it before it becomes a real order.
		const customLength = variant ? requestedLengthFor(product, line) : null;

		const spec = variant
			? {
					colorId: variant.colorId,
					width: variant.widthValue,
					widthUnit: variant.widthUnit ?? undefined,
					thickness: variant.thicknessValue,
					thicknessUnit: variant.thicknessUnit ?? undefined,
					length: customLength != null ? String(customLength) : variant.lengthValue,
					lengthUnit:
						variant.lengthUnit ??
						(customLength != null ? (product.maxLengthUnit ?? undefined) : undefined)
				}
			: {
					colorId: line.colorId ?? null,
					width: line.width != null ? String(line.width) : null,
					widthUnit: line.widthUnit ?? undefined,
					thickness: line.thickness != null ? String(line.thickness) : null,
					thicknessUnit: line.thicknessUnit ?? undefined,
					length: line.length != null ? String(line.length) : null,
					lengthUnit: line.lengthUnit ?? undefined
				};

		return {
			productId,
			variantId: variant?.id ?? null,
			quantity,
			amount: line.amount ?? `qty-${quantity}`,
			price,
			priceBasis,
			priceIncludesVat,
			...spec
		};
	});
}
