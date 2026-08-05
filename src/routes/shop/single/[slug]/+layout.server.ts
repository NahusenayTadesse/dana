import { db } from '$lib/server/db';
import {
	productCategories,
	products,
	productImages,
	productVariants,
	colors,
	widths,
	thicknesses,
	lengths
} from '$lib/server/db/schema';
import { eq, and, ne, inArray } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { fetchVariantRowsForProducts, assembleProductCard } from '$lib/server/product-listing';

// The hardware/trim products a customer typically needs alongside any sheet,
// tile, or coil purchase — shown as "Accessories" on every product page
// (minus whichever of these the customer is already looking at).
const ACCESSORY_SLUGS = ['ridge-caps', 'flashings', 'gutters-and-downpipes'];

export const load: LayoutServerLoad = async ({ params }) => {
	const { slug } = params;

	if (!slug) {
		error(400, 'Invalid product identifier.');
	}

	// 1. Fetch the base product record
	const product = await db
		.select({
			id: products.id,
			name: products.name,
			slug: products.slug,
			brand: products.brand,
			categoryId: products.categoryId,
			categoryName: productCategories.name,
			featuredImage: products.featuredImage,
			description: products.description,
			overview: products.overview,
			quantity: products.quantity,
			supplierId: products.supplierId,
			reorderLevel: products.reorderLevel,
			thickness: products.thickness,
			width: products.width,
			soldBy: products.soldBy,
			maxLength: products.maxLength,
			maxLengthUnit: products.maxLengthUnit,
			coatingType: products.coatingType,
			colorOptions: products.colorOptions,
			sizeRange: products.sizeRange,
			finish: products.finish,
			performanceFeatures: products.performanceFeatures,
			advantages: products.advantages,
			applications: products.applications,
			isFeaturedOnHome: products.isFeaturedOnHome
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.where(eq(products.slug, slug))
		.then((rows) => rows[0]);

	if (!product) {
		error(404, 'Product not found');
	}

	// 2. Gallery images bound to this product (separate from per-variant images)
	const imageRows = await db
		.select({ url: productImages.imageUrl })
		.from(productImages)
		.where(eq(productImages.productId, product.id));
	const images = imageRows.map((img) => img.url);

	// 3. Full variant matrix — every color/width/thickness/length combo, with its
	// own price (nullable = quote-only), stock, sku, and image.
	const variants = await db
		.select({
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
		.where(and(eq(productVariants.productId, product.id), eq(productVariants.isActive, true)));

	// 4. Related cross-sell products from the same category
	const relatedProducts = await db
		.select({
			id: products.id,
			slug: products.slug,
			name: products.name,
			featuredImage: products.featuredImage,
			thickness: products.thickness
		})
		.from(products)
		.where(
			and(
				eq(products.categoryId, product.categoryId),
				ne(products.id, product.id),
				eq(products.isActive, true)
			)
		)
		.limit(3);

	// 5. Accessories — ridge caps / flashings / gutters, ready to add straight
	// from their own variant picker (see product-card.svelte reuse below),
	// so a sheet/tile purchase can pick up the hardware it needs in one pass.
	const accessoryProducts = await db
		.select({
			productId: products.id,
			id: products.id,
			name: products.name,
			productName: products.name,
			slug: products.slug,
			featuredImage: products.featuredImage,
			image: products.featuredImage,
			categoryName: productCategories.name,
			brand: products.brand,
			coatingType: products.coatingType,
			thickness: products.thickness,
			width: products.width,
			soldBy: products.soldBy,
			baseQuantity: products.quantity
		})
		.from(products)
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.where(
			and(
				inArray(products.slug, ACCESSORY_SLUGS),
				ne(products.id, product.id),
				eq(products.isActive, true)
			)
		);

	const accessoryVariantRows = await fetchVariantRowsForProducts(accessoryProducts.map((p) => p.productId));
	const accessories = accessoryProducts.map((p) => assembleProductCard(p, accessoryVariantRows));

	return {
		product,
		images,
		variants,
		relatedProducts,
		accessories
	};
};