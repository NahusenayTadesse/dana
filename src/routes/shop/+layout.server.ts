import { db } from '$lib/server/db';
import {
	products,
	productCategories,
	productVariants,
	colors,
	widths,
	thicknesses
} from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import { eq, sql, and, like, asc, gte, lte, inArray } from 'drizzle-orm';

const PAGE_SIZE = 20;
const THICKNESS_UNIT = 'mm' as const; // gauge is a different, non-comparable scale — see note to user

export const load: LayoutServerLoad = async ({ url }) => {
	// 1. Parse filters from the URL
	const search = url.searchParams.get('search') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const offset = (page - 1) * PAGE_SIZE;

	const minThickParam = url.searchParams.get('minThick');
	const maxThickParam = url.searchParams.get('maxThick');
	const minThick = minThickParam ? Number(minThickParam) : undefined;
	const maxThick = maxThickParam ? Number(maxThickParam) : undefined;

	const selectedColorIds =
		url.searchParams.get('colors')?.split(',').filter(Boolean).map(Number) ?? [];
	const selectedWidthIds =
		url.searchParams.get('widths')?.split(',').filter(Boolean).map(Number) ?? [];
	const selectedCats =
		url.searchParams.get('categories')?.split(',').filter(Boolean).map(Number) ?? [];
	const onlyAvailable = url.searchParams.get('available') === 'true';

	// 2. Sidebar option lists — now sourced from the real lookup tables, no more string parsing
	const categoriesList = await db
		.select({ id: productCategories.id, name: productCategories.name })
		.from(productCategories)
		.where(eq(productCategories.isActive, true));

	const colorsList = await db
		.select({ id: colors.id, name: colors.name, hexValue: colors.hexValue, code: colors.code })
		.from(colors)
		.where(eq(colors.isActive, true));

	const widthsList = await db
		.select({ id: widths.id, value: widths.value, unit: widths.unit, label: widths.label })
		.from(widths)
		.where(eq(widths.isActive, true))
		.orderBy(asc(widths.value));

	const [thicknessBounds] = await db
		.select({
			min: sql<number>`min(${thicknesses.value})`,
			max: sql<number>`max(${thicknesses.value})`
		})
		.from(thicknesses)
		.where(and(eq(thicknesses.isActive, true), eq(thicknesses.unit, THICKNESS_UNIT)));

	// 3. Resolve the mm-range filter into concrete thickness ids (avoids a tricky join-order
	// problem where the thickness join condition would need to reference itself)
	let matchingThicknessIds: number[] | undefined;
	if (minThick !== undefined || maxThick !== undefined) {
		const rows = await db
			.select({ id: thicknesses.id })
			.from(thicknesses)
			.where(
				and(
					eq(thicknesses.unit, THICKNESS_UNIT),
					minThick !== undefined ? gte(thicknesses.value, minThick.toString()) : undefined,
					maxThick !== undefined ? lte(thicknesses.value, maxThick.toString()) : undefined
				)
			);
		matchingThicknessIds = rows.map((r) => r.id);
	}

	// 4. Product-level filters (search/category), independent of variant specs
	const productWhere = and(
		eq(products.isActive, true),
		search ? like(products.name, `%${search}%`) : undefined,
		selectedCats.length > 0 ? inArray(products.categoryId, selectedCats) : undefined
	);

	// Variant-level spec filters — these require an actual matching variant to exist
	const hasVariantSpecFilter =
		selectedColorIds.length > 0 || selectedWidthIds.length > 0 || matchingThicknessIds !== undefined;

	const specFilterConditions = and(
		selectedColorIds.length > 0 ? inArray(productVariants.colorId, selectedColorIds) : undefined,
		selectedWidthIds.length > 0 ? inArray(productVariants.widthId, selectedWidthIds) : undefined,
		matchingThicknessIds
			? inArray(productVariants.thicknessId, matchingThicknessIds.length ? matchingThicknessIds : [-1])
			: undefined,
		onlyAvailable ? gte(productVariants.quantity, 1) : undefined
	);

	// 5. Resolve the full set of matching product ids (three paths depending on what's active)
	let allIds: number[];

	if (hasVariantSpecFilter) {
		// Any spec filter (color/width/thickness) means the product MUST have a matching variant
		const rows = await db
			.selectDistinct({ id: products.id })
			.from(products)
			.innerJoin(
				productVariants,
				and(
					eq(productVariants.productId, products.id),
					eq(productVariants.isActive, true),
					specFilterConditions
				)
			)
			.where(productWhere)
			.orderBy(asc(products.createdAt));
		allIds = rows.map((r) => r.id);
	} else if (onlyAvailable) {
		// "In stock" alone shouldn't hide simple retail products that don't have variants at all —
		// so this checks the product's own quantity OR any in-stock variant
		const availabilityCond = sql`(
			${products.quantity} >= 1
			OR EXISTS (
				SELECT 1 FROM ${productVariants}
				WHERE ${productVariants.productId} = ${products.id}
				AND ${productVariants.isActive} = true
				AND ${productVariants.quantity} >= 1
			)
		)`;
		const rows = await db
			.selectDistinct({ id: products.id })
			.from(products)
			.where(and(productWhere, availabilityCond))
			.orderBy(asc(products.createdAt));
		allIds = rows.map((r) => r.id);
	} else {
		const rows = await db
			.select({ id: products.id })
			.from(products)
			.where(productWhere)
			.orderBy(asc(products.createdAt));
		allIds = rows.map((r) => r.id);
	}

	const totalCount = allIds.length;
	const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
	const pagedIds = allIds.slice(offset, offset + PAGE_SIZE);

	// 6. Fetch the actual product rows for this page
	const productsData = pagedIds.length
		? await db
				.select({
					productId: products.id,
					productName: products.name,
					slug: products.slug,
					image: products.featuredImage,
					categoryId: products.categoryId,
					categoryName: productCategories.name,
					baseQuantity: products.quantity
				})
				.from(products)
				.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
				.where(inArray(products.id, pagedIds))
				.orderBy(asc(products.createdAt))
		: [];

	// 7. Fetch variants for this page. If a spec filter is active, only show the MATCHING
	// variants (so price/swatches reflect the selection, not the whole catalog).
	const variantRows = pagedIds.length
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
					thicknessUnit: thicknesses.unit
				})
				.from(productVariants)
				.leftJoin(colors, eq(colors.id, productVariants.colorId))
				.leftJoin(widths, eq(widths.id, productVariants.widthId))
				.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
				.where(
					and(
						inArray(productVariants.productId, pagedIds),
						eq(productVariants.isActive, true),
						hasVariantSpecFilter ? specFilterConditions : undefined
					)
				)
		: [];

	// 8. Assemble: price range + de-duped color swatches per product
	const productList = productsData.map((p) => {
		const variants = variantRows.filter((v) => v.productId === p.productId);
		const prices = variants.map((v) => v.price).filter((v): v is string => v !== null);
		const variantQty = variants.reduce((sum, v) => sum + (v.quantity ?? 0), 0);

		const colorSwatches = Array.from(
			new Map(
				variants
					.filter((v) => v.colorId !== null)
					.map((v) => [v.colorId, { id: v.colorId, name: v.colorName, hex: v.colorHex }])
			).values()
		);

		return {
			...p,
			minPrice: prices.length ? Math.min(...prices.map(Number)) : null,
			maxPrice: prices.length ? Math.max(...prices.map(Number)) : null,
			hasQuoteOnlyVariant: variants.some((v) => v.price === null),
			totalQuantity: (p.baseQuantity ?? 0) + variantQty,
			colorSwatches,
			variants
		};
	});

	return {
		productList,
		categoriesList,
		colorsList,
		widthsList,
		thicknessBounds: {
			min: thicknessBounds?.min ?? 0,
			max: thicknessBounds?.max ?? 5
		},
		pagination: {
			currentPage: page,
			totalPages,
			totalCount,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1
		}
	};
};