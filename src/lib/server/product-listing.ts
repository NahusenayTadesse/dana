import { db } from '$lib/server/db';
import { productVariants, colors, widths, thicknesses, discounts } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { ThicknessUnit, WidthUnit } from '$lib/units';
import { applyPercentDiscount, clampPercentage } from '$lib/server/pricing';

// Shared between every product listing surface (shop grid, home "best sellers", etc.)
// so price ranges / swatches / stock totals are computed the same way everywhere.

type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

// Units are the DB enum unions, not bare `string`. Widening them here meant
// this type disagreed with every component that consumes it (all of which
// declare the narrow union), producing assignability errors that were being
// worked around rather than fixed.
export type ProductVariantRow = {
	productId: number;
	variantId: number;
	sku: string | null;
	/** What the customer pays per unit — already discounted when a discount applies. */
	price: string | null;
	/** The catalog price before any product discount. */
	listPrice: string | null;
	/** Product discount percentage applied to `price`, or null. */
	discountPercentage: number | null;
	quantity: number;
	imageUrl: string | null;
	colorId: number | null;
	colorName: string | null;
	colorHex: string | null;
	widthValue: string | null;
	widthUnit: WidthUnit | null;
	widthLabel: string | null;
	thicknessValue: string | null;
	thicknessUnit: ThicknessUnit | null;
};

export type ProductDiscount = {
	/** 0–100 */
	percentage: number;
	name: string;
	description: string | null;
};

/**
 * Active product discounts by product id. `discounts.amount` is a percentage;
 * if a product somehow carries several active rows, the largest one wins.
 * Checkout (orderLines.ts) and every storefront listing read this same map, so
 * the price a customer sees is the price they are charged.
 */
export async function fetchProductDiscounts(
	productIds: number[],
	tx: DbLike = db
): Promise<Map<number, ProductDiscount>> {
	const ids = [...new Set(productIds)].filter((id) => Number.isInteger(id) && id > 0);
	const map = new Map<number, ProductDiscount>();
	if (ids.length === 0) return map;

	const rows = await tx
		.select({
			productId: discounts.productId,
			amount: discounts.amount,
			name: discounts.name,
			description: discounts.description
		})
		.from(discounts)
		.where(and(inArray(discounts.productId, ids), eq(discounts.isActive, true)));

	for (const row of rows) {
		if (row.productId == null) continue;
		const percentage = clampPercentage(row.amount);
		if (percentage <= 0) continue;
		const current = map.get(row.productId);
		if (!current || percentage > current.percentage) {
			map.set(row.productId, { percentage, name: row.name, description: row.description });
		}
	}
	return map;
}

/**
 * A stored price as the storefront should treat it: null (quote-only) unless it
 * is a positive number. Checkout (orderLines.ts) prices 0 as quote-only too, so
 * listing "0 ETB" would advertise a price nobody is charged.
 */
export function sellablePrice(price: string | null): string | null {
	if (price == null) return null;
	const n = Number(price);
	return Number.isFinite(n) && n > 0 ? price : null;
}

/** A catalog price string with a discount applied, keeping null (quote-only) as null. */
export function discountedPrice(price: string | null, discount: ProductDiscount | undefined): string | null {
	const sellable = sellablePrice(price);
	if (sellable == null || !discount) return sellable;
	return applyPercentDiscount(Number(sellable), discount.percentage).toFixed(2);
}

/**
 * Apply each row's product discount to its `price`, keeping the original as
 * `listPrice`. Rows need a `productId`; pass `discountMap` when it has already
 * been fetched.
 */
export async function withDiscounts<R extends { productId: number; price: string | null }>(
	rows: R[],
	discountMap?: Map<number, ProductDiscount>
): Promise<Array<R & { listPrice: string | null; discountPercentage: number | null }>> {
	const map = discountMap ?? (await fetchProductDiscounts(rows.map((r) => r.productId)));
	return rows.map((row) => {
		const discount = map.get(row.productId);
		const listPrice = sellablePrice(row.price);
		return {
			...row,
			listPrice,
			price: discountedPrice(row.price, discount),
			discountPercentage: discount && listPrice != null ? discount.percentage : null
		};
	});
}

export async function fetchVariantRowsForProducts(
	productIds: number[]
): Promise<ProductVariantRow[]> {
	if (productIds.length === 0) return [];

	const rows = await db
		.select({
			productId: productVariants.productId,
			variantId: productVariants.id,
			sku: productVariants.sku,
			price: productVariants.price,
			quantity: productVariants.quantity,
			imageUrl: productVariants.imageUrl,
			colorId: colors.id,
			colorName: colors.name,
			colorHex: colors.hexValue,
			widthValue: widths.value,
			widthUnit: widths.unit,
			widthLabel: widths.label,
			thicknessValue: thicknesses.value,
			thicknessUnit: thicknesses.unit
		})
		.from(productVariants)
		.leftJoin(colors, eq(colors.id, productVariants.colorId))
		.leftJoin(widths, eq(widths.id, productVariants.widthId))
		.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
		.where(
			and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))
		);

	return withDiscounts(rows);
}

export function assembleProductCard<
	T extends { productId: number; baseQuantity?: number | null },
	V extends {
		productId: number;
		price: string | null;
		quantity: number | null;
		discountPercentage?: number | null;
	} = ProductVariantRow
>(product: T, variantRows: V[]) {
	const variants = variantRows.filter((v) => v.productId === product.productId);
	const pricedVariants = variants.map((v) => v.price).filter((v): v is string => v !== null);

	// `products.quantity` is the synced total of ALL its variants (see
	// $lib/server/stock), archived ones included, so adding it to the variant
	// sum double-counted. Only the active variants listed here are sellable.
	const totalQuantity = variants.reduce((sum, v) => sum + (v.quantity ?? 0), 0);
	const discountPercentage =
		variants.map((v) => v.discountPercentage ?? 0).reduce((a, b) => Math.max(a, b), 0) || null;

	return {
		...product,
		minPrice: pricedVariants.length ? Math.min(...pricedVariants.map(Number)) : null,
		maxPrice: pricedVariants.length ? Math.max(...pricedVariants.map(Number)) : null,
		hasQuoteOnlyVariant: variants.some((v) => v.price === null),
		totalQuantity,
		discountPercentage,
		variants
	};
}
