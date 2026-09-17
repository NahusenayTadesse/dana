import { db } from '$lib/server/db';
import {
	products,
	productCategories,
	productVariants,
	variantPrices,
	tags,
	productTags,
	discounts,
	productSuppliers
} from '$lib/server/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { schema } from './schema';
import { describeDbError } from '$lib/server/dbErrors';
import { clampPercentage } from '$lib/server/pricing';

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
			// Synced total of every variant's warehouse stock ($lib/server/stock).
			quantity: products.quantity,
			description: products.description,
			overview: products.overview,

			supplier: productSuppliers.name,
			// products.categoryId is the single source of truth for a product's
			// category — the storefront filter, related products and /buy all
			// read it, so the admin list does too.
			category: productCategories.name,

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
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.where(eq(products.isActive, true));

	const productIds = productsData.map((p) => p.id);

	// If no products, stop early and avoid empty DB calls
	if (productIds.length === 0) {
		return { productList: [], form };
	}

	// 2. Fetch related data CONCURRENTLY and FILTERED by productIds
	const [rawPrices, rawTags, rawDiscounts] = await Promise.all([
		// Prices now live per-variant, per-basis (variantPrices), not one flat
		// row per product — join through productVariants to get back to productId.
		db
			.select({
				productId: productVariants.productId,
				variantId: productVariants.id,
				sku: productVariants.sku,
				basis: variantPrices.basis,
				price: variantPrices.price,
				priceIncludesVat: variantPrices.priceIncludesVat
			})
			.from(variantPrices)
			.innerJoin(productVariants, eq(productVariants.id, variantPrices.variantId))
			.where(
				and(inArray(productVariants.productId, productIds), eq(productVariants.isActive, true))
			),
		db
			.selectDistinct({
				productId: productTags.productId,
				name: tags.name
			})
			.from(productTags)
			.innerJoin(tags, eq(productTags.tagId, tags.id))
			.where(inArray(productTags.productId, productIds)),
		db
			.select({
				productId: discounts.productId,
				name: discounts.name,
				description: discounts.description,
				amount: discounts.amount
			})
			.from(discounts)
			.where(and(inArray(discounts.productId, productIds), eq(discounts.isActive, true)))
	]);

	// 3. Group data into dictionaries for O(1) lookup
	const pricesMap: Record<number, Array<{ key: string; amount: string; price: string }>> = {};
	const tagsMap: Record<number, string[]> = {};
	const discountMap: Record<
		number,
		{ discount: number; discountName: string; discountDescription: string | null }
	> = {};

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
		// Rates from every variant are merged into one list, so the basis label
		// alone repeats ("Per piece" twice) — key and label by variant too.
		const variantName = price.sku ?? `Variant #${price.variantId}`;
		(pricesMap[price.productId] ??= []).push({
			key: `${price.variantId}-${price.basis}`,
			amount: `${variantName} · ${basisLabels[price.basis] ?? price.basis}`,
			price: price.priceIncludesVat ? `${price.price} (incl. VAT)` : price.price
		});
	}

	for (const tag of rawTags) {
		if (tag.productId == null) continue;
		(tagsMap[tag.productId] ??= []).push(tag.name);
	}

	for (const row of rawDiscounts) {
		if (row.productId == null) continue;
		const pct = clampPercentage(row.amount);
		if (pct <= 0 || (discountMap[row.productId]?.discount ?? 0) >= pct) continue;
		discountMap[row.productId] = {
			discount: pct,
			discountName: row.name,
			discountDescription: row.description
		};
	}

	// 4. Merge data using the maps
	const productList = productsData.map((p) => ({
		...p,
		priceList: (pricesMap[p.id] ?? []).map((price) => ({
			key: price.key,
			amount: price.amount,
			price: `ETB ${price.price}`
		})),
		category: p.category ? [p.category] : [],
		tag: tagsMap[p.id] ?? [],
		discount: discountMap[p.id]?.discount ?? null,
		discountName: discountMap[p.id]?.discountName ?? null,
		discountDescription: discountMap[p.id]?.discountDescription ?? null
	}));

	return { productList, form };
};

export const actions: Actions = {
	// A discount is a percentage off each selected product's price, applied at
	// checkout (see $lib/server/orderLines). One named discount can cover many
	// products — one `discounts` row per product. Saving replaces whatever
	// discount those products had; a percentage of 0 removes it.
	addDiscount: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check your form data.' }, { status: 400 });
		}

		const { name, description, amount } = form.data;
		const ids = [...new Set(form.data.ids)];

		try {
			const saved = await db.transaction(async (tx) => {
				// Only live products — an id for an archived or missing product is ignored.
				const existing = await tx
					.select({ id: products.id })
					.from(products)
					.where(and(inArray(products.id, ids), eq(products.isActive, true)))
					.then((rows) => rows.map((r) => r.id));
				if (existing.length === 0) return 0;

				// Clear any existing discounts on the selected products, then reinsert
				await tx.delete(discounts).where(inArray(discounts.productId, existing));

				if (amount > 0) {
					await tx.insert(discounts).values(
						existing.map((productId) => ({
							productId,
							name: name.trim(),
							description: description?.trim() || null,
							amount: amount.toFixed(2), // decimal column -> string
							createdBy: locals?.user?.id
						}))
					);
				}
				return existing.length;
			});

			if (saved === 0) {
				return message(
					form,
					{ type: 'error', text: 'None of the selected products exist any more. Reload the page.' },
					{ status: 400 }
				);
			}

			return message(form, {
				type: 'success',
				text:
					amount > 0
						? `${amount}% discount "${name.trim()}" applied to ${saved} product${saved === 1 ? '' : 's'}.`
						: `Discount removed from ${saved} product${saved === 1 ? '' : 's'}.`
			});
		} catch (err) {
			console.error('Error saving discount:', err);
			return message(
				form,
				{
					type: 'error',
					text: describeDbError(err, 'An error occurred while saving the discount. Please try again.')
				},
				{ status: 500 }
			);
		}
	}
};
