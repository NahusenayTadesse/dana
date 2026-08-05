import { db } from '$lib/server/db';
import {
	products,
	productCategories,
	productVariants,
	variantPrices,
	tags,
	categoriesProducts,
	productTags,
	discounts,
	productSuppliers
} from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from '../$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { schema } from './schema';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(schema));

	// 1. Fetch only active products, with supplier + full spec fields
	const productsData = await db
		.select({
			id: products.id,
			name: products.name,
			slug: products.slug,
			brand: products.brand,
			image: products.featuredImage,
			reorderLevel: products.reorderLevel,
			quantity: products.quantity,
			description: products.description,
			overview: products.overview,

			supplier: productSuppliers.name,

			soldBy: products.soldBy,
			thickness: products.thickness,
			width: products.width,
			maxLength: products.maxLength,
			maxLengthUnit: products.maxLengthUnit,
			coatingType: products.coatingType,
			colorOptions: products.colorOptions,
			sizeRange: products.sizeRange,
			finish: products.finish,

			performanceFeatures: products.performanceFeatures,
			advantages: products.advantages,
			applications: products.applications,

			isFeaturedOnHome: products.isFeaturedOnHome,
			createdAt: products.createdAt
		})
		.from(products)
		.leftJoin(productSuppliers, eq(productSuppliers.id, products.supplierId))
		.where(eq(products.isActive, true));

	const productIds = productsData.map((p) => p.id);

	// If no products, stop early and avoid empty DB calls
	if (productIds.length === 0) {
		return { productList: [], form };
	}

	// 2. Fetch related data CONCURRENTLY and FILTERED by productIds
	const [rawPrices, rawCategories, rawTags] = await Promise.all([
		// Prices now live per-variant, per-basis (variantPrices), not one flat
		// row per product — join through productVariants to get back to productId.
		db
			.select({
				productId: productVariants.productId,
				basis: variantPrices.basis,
				price: variantPrices.price,
				priceIncludesVat: variantPrices.priceIncludesVat
			})
			.from(variantPrices)
			.innerJoin(productVariants, eq(productVariants.id, variantPrices.variantId))
			.where(inArray(productVariants.productId, productIds)),
		db
			.selectDistinct({
				productId: categoriesProducts.productId,
				name: productCategories.name
			})
			.from(categoriesProducts)
			.innerJoin(productCategories, eq(productCategories.id, categoriesProducts.categoryId))
			.where(inArray(categoriesProducts.productId, productIds)),
		db
			.selectDistinct({
				productId: productTags.productId,
				name: tags.name
			})
			.from(productTags)
			.innerJoin(tags, eq(productTags.tagId, tags.id))
			.where(inArray(productTags.productId, productIds))
	]);

	// 3. Group data into dictionaries for O(1) lookup
	const pricesMap: Record<number, Array<{ amount: string; price: string }>> = {};
	const categoriesMap: Record<number, string[]> = {};
	const tagsMap: Record<number, string[]> = {};

	const basisLabels: Record<string, string> = {
		quantity: 'Per piece',
		length: 'Per length',
		width: 'Per width',
		thickness: 'Per thickness',
		color: 'Per colour',
		weight: 'Per weight',
		area: 'Per area'
	};

	for (const price of rawPrices) {
		if (price.productId == null) continue;
		(pricesMap[price.productId] ??= []).push({
			amount: basisLabels[price.basis] ?? price.basis,
			price: price.priceIncludesVat ? `${price.price} (incl. VAT)` : price.price
		});
	}

	for (const cat of rawCategories) {
		if (cat.productId == null) continue;
		(categoriesMap[cat.productId] ??= []).push(cat.name);
	}

	for (const tag of rawTags) {
		if (tag.productId == null) continue;
		(tagsMap[tag.productId] ??= []).push(tag.name);
	}

	// 4. Merge data using the maps
	const productList = productsData.map((p) => ({
		...p,
		priceList: (pricesMap[p.id] ?? []).map((price) => ({
			amount: price.amount,
			price: `ETB ${price.price}`
		})),
		category: categoriesMap[p.id] ?? [],
		tag: tagsMap[p.id] ?? []
	}));

	return { productList, form };
};

export const actions: Actions = {
	addDiscount: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check your form data.' });
		}

		const { ids, name, description, amount } = form.data;

		try {
			await db.transaction(async (tx) => {
				// Clear any existing discounts on the selected products, then reinsert
				await tx.delete(discounts).where(inArray(discounts.productId, ids));

				if (amount > 0) {
					const discountRecords = ids.map((p) => ({
						productId: p,
						name,
						description,
						amount: String(amount), // decimal column -> string
						createdBy: locals?.user?.id
					}));
					await tx.insert(discounts).values(discountRecords);
				}
			});

			return message(form, { type: 'success', text: 'New Discount Successfully Added' });
		} catch (err) {
			console.error(err);
			return message(
				form,
				{ type: 'error', text: 'An error occurred while adding the Discount. ' + err?.message },
				{ status: 500 }
			);
		}
	}
};