import { db } from '$lib/server/db';
import {
	products,
	productCategories,
	prices,
	tags,
	categoriesProducts,
	productTags,
	discounts
} from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from '../$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(schema));

	// 1. Fetch only active products
	const productsData = await db
		.select({
			id: products.id,
			name: products.name,
			brand: products.brand,
			image: products.featuredImage,
			reorderLevel: products.reorderLevel,
			quantity: products.quantity,
			description: products.description
		})
		.from(products)
		.where(eq(products.isActive, true));

	const productIds = productsData.map((p) => p.id);

	// If no products, stop early and avoid empty DB calls
	if (productIds.length === 0) {
		return { productList: [], form };
	}

	// 2. Fetch related data CONCURRENTLY and FILTERED by productIds
	const [rawPrices, rawCategories, rawTags] = await Promise.all([
		db.select().from(prices).where(inArray(prices.productId, productIds)),
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

	// 3. Group data into Dictionaries for O(1) lookup speed
	const pricesMap: Record<string, typeof rawPrices> = {};
	const categoriesMap: Record<string, Array<{ name: string }>> = {};
	const tagsMap: Record<string, Array<{ name: string }>> = {};

	for (const price of rawPrices) {
		if (!pricesMap[price.productId]) pricesMap[price.productId] = [];
		pricesMap[price.productId].push(price);
	}

	for (const cat of rawCategories) {
		if (!categoriesMap[cat.productId]) categoriesMap[cat.productId] = [];
		categoriesMap[cat.productId].push({ name: cat.name });
	}

	for (const tag of rawTags) {
		if (!tagsMap[tag.productId]) tagsMap[tag.productId] = [];
		tagsMap[tag.productId].push({ name: tag.name });
	}

	// 4. Merge data instantly using the maps
	const productList = productsData.map((p) => ({
		...p,
		priceList: (pricesMap[p.id] || []).map((price) => ({
			amount: `${price.amount} Pieces`,
			price: `ETB ${price.price}`
		})),
		category: Object.values(categoriesMap[p.id] || {}).map((cat) => cat.name),
		tag: Object.values(tagsMap[p.id] || {}).map((tag) => tag.name)
	}));

	return {
		productList,
		form
	};
};

export const actions: Actions = {
	addDiscount: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(schema));
		console.log(form);

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check your form data.' });
		}

		const { ids, name, description, amount } = form.data;

		try {
			await db.transaction(async (tx) => {
				await tx.delete(discounts).where(inArray(discounts.productId, ids));
				if (amount > 0) {
					const priceRecords = ids.map((p) => ({
						productId: p,
						name: name,
						description: description,
						amount: amount,
						createdBy: locals?.user?.id
					}));
					await tx.insert(discounts).values(priceRecords);
				}
			});

			return message(form, { type: 'success', text: 'New Discount Successfully Added' });
		} catch (err) {
			console.error(err);
			return message(
				form,
				{
					type: 'error',
					text: 'An error occurred while adding the Discount.' + err?.message
				},
				{ status: 500 }
			);
		}
	}
};
