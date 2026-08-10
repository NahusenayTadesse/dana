import { db } from '$lib/server/db';
import { productVariants, colors, widths, thicknesses } from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { ThicknessUnit, WidthUnit } from '$lib/units';

// Shared between every product listing surface (shop grid, home "best sellers", etc.)
// so price ranges / swatches / stock totals are computed the same way everywhere.

// Units are the DB enum unions, not bare `string`. Widening them here meant
// this type disagreed with every component that consumes it (all of which
// declare the narrow union), producing assignability errors that were being
// worked around rather than fixed.
export type ProductVariantRow = {
	productId: number;
	variantId: number;
	sku: string | null;
	price: string | null;
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

export async function fetchVariantRowsForProducts(
	productIds: number[]
): Promise<ProductVariantRow[]> {
	if (productIds.length === 0) return [];

	return db
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
}

export function assembleProductCard<T extends { productId: number; baseQuantity: number | null }>(
	product: T,
	variantRows: ProductVariantRow[]
) {
	const variants = variantRows.filter((v) => v.productId === product.productId);
	const pricedVariants = variants.map((v) => v.price).filter((v): v is string => v !== null);
	const variantQty = variants.reduce((sum, v) => sum + (v.quantity ?? 0), 0);

	return {
		...product,
		minPrice: pricedVariants.length ? Math.min(...pricedVariants.map(Number)) : null,
		maxPrice: pricedVariants.length ? Math.max(...pricedVariants.map(Number)) : null,
		hasQuoteOnlyVariant: variants.some((v) => v.price === null),
		totalQuantity: (product.baseQuantity ?? 0) + variantQty,
		variants
	};
}
