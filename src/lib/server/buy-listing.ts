import { db } from '$lib/server/db';
import {
	products,
	productCategories,
	productVariants,
	colors,
	widths,
	thicknesses,
	lengths
} from '$lib/server/db/schema';
import { eq, asc, and, inArray } from 'drizzle-orm';

/**
 * The full active catalog with every variant attached — no filters, no
 * pagination — so a page can render the pick → configure → total flow entirely
 * client-side.
 *
 * Shared by /buy and /checkout: both render the same grouped order blocks, and
 * those blocks need the variant matrix to offer the colours a product actually
 * comes in and to clamp length edits to the catalog's real stops. Without it a
 * block falls back to free-dialling any length at all.
 */
export async function loadBuyProductList() {
	const productsData = await db
		.select({
			productId: products.id,
			productName: products.name,
			slug: products.slug,
			image: products.featuredImage,
			categoryName: productCategories.name,
			baseQuantity: products.quantity,
			soldBy: products.soldBy,
			isLengthCustomizable: products.isLengthCustomizable,
			minLength: products.minLength,
			maxLength: products.maxLength,
			maxLengthUnit: products.maxLengthUnit,
			lengthStep: products.lengthStep
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.where(eq(products.isActive, true))
		.orderBy(asc(products.name));

	const productIds = productsData.map((p) => p.productId);

	const variantRows = productIds.length
		? await db
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
					thicknessUnit: thicknesses.unit,
					lengthValue: lengths.value,
					lengthUnit: lengths.unit,
					lengthLabel: lengths.label,
					isCustomLength: lengths.isCustom
				})
				.from(productVariants)
				.leftJoin(colors, eq(colors.id, productVariants.colorId))
				.leftJoin(widths, eq(widths.id, productVariants.widthId))
				.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
				.leftJoin(lengths, eq(lengths.id, productVariants.lengthId))
				.where(
					and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))
				)
		: [];

	return productsData.map((p) => {
		const variants = variantRows.filter((v) => v.productId === p.productId);
		const pricedVariants = variants.map((v) => v.price).filter((v): v is string => v !== null);

		return {
			...p,
			variants,
			minLength: p.minLength != null ? Number(p.minLength) : null,
			maxLength: p.maxLength != null ? Number(p.maxLength) : null,
			lengthStep: p.lengthStep != null ? Number(p.lengthStep) : null,
			minPrice: pricedVariants.length ? Math.min(...pricedVariants.map(Number)) : null,
			maxPrice: pricedVariants.length ? Math.max(...pricedVariants.map(Number)) : null,
			hasQuoteOnlyVariant: variants.some((v) => v.price === null)
		};
	});
}
