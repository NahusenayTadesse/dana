import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { edit, adjust, damaged, editGallery } from './schema';

import { db } from '$lib/server/db';
import {
	productCategories,
	products,
	user,
	productSuppliers as suppliers,
	orderItems,
	orders,
	productVariants,
	productImages,
	tags,
	productTags
} from '$lib/server/db/schema';
import { eq, and, sql, asc } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { parseIdParam } from '$lib/server/params';

export const load: LayoutServerLoad = async ({ params }) => {
	// Covers the /ranges and /damaged children too: `Number('abc')` is NaN,
	// which mysql2 sends unquoted and MySQL rejects (a 500).
	const productId = parseIdParam(params.id);

	const adjustForm = await superValidate(zod4(adjust));
	const damagedForm = await superValidate(zod4(damaged));
	const galleryEdit = await superValidate(zod4(editGallery));

	const allCategories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.isActive, true));

	const allTags = await db
		.select({ value: tags.id, name: tags.name })
		.from(tags)
		.orderBy(asc(tags.name));

	const supplierList = await db
		.select({ value: suppliers.id, name: suppliers.name })
		.from(suppliers)
		.where(eq(suppliers.isActive, true));

	const result = await db
		.select({ url: productImages.imageUrl })
		.from(productImages)
		.where(eq(productImages.productId, productId))
		.orderBy(asc(productImages.id));

	const images = result.map((img) => img.url);

	// Aggregates (min price, delivered sales) are computed as scalar subqueries
	// so the joins below don't fan out and inflate the SUM / MIN.
	const product = await db
		.select({
			id: products.id,
			name: products.name,
			price: sql<number | null>`(
				SELECT MIN(${productVariants.price}) FROM ${productVariants}
				WHERE ${productVariants.productId} = ${products.id}
			)`,
			brand: products.brand,
			description: products.description,
			// Synced total of the variants' warehouse stock ($lib/server/stock).
			quantity: products.quantity,
			isActive: products.isActive,
			categoryId: products.categoryId,
			category: productCategories.name,
			reorderLevel: products.reorderLevel,
			commission: products.commissionAmount,
			supplier: suppliers.name,
			supplierId: suppliers.id,
			image: products.featuredImage,
			soldBy: products.soldBy,
			thickness: products.thickness,
			width: products.width,
			maxLength: products.maxLength,
			maxLengthUnit: products.maxLengthUnit,
			isLengthCustomizable: products.isLengthCustomizable,
			minLength: products.minLength,
			lengthStep: products.lengthStep,
			coatingType: products.coatingType,
			colorOptions: products.colorOptions,
			sizeRange: products.sizeRange,
			finish: products.finish,
			overview: products.overview,
			performanceFeatures: products.performanceFeatures,
			advantages: products.advantages,
			applications: products.applications,
			saleCount: sql<number>`(
				SELECT COALESCE(SUM(${orderItems.quantity}), 0)
				FROM ${orderItems}
				JOIN ${orders} ON ${orders.id} = ${orderItems.orderId}
				WHERE ${orderItems.productId} = ${products.id}
				AND ${orders.status} = 'delivered'
			)`,
			createdBy: user.name,
			createdAt: sql<string>`DATE_FORMAT(${products.createdAt}, '%Y-%m-%d')`
		})
		.from(products)
		.leftJoin(suppliers, eq(suppliers.id, products.supplierId))
		.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
		.leftJoin(user, eq(products.createdBy, user.id))
		.where(eq(products.id, productId))
		.then((rows) => rows[0]);

	// A valid-but-missing id used to render an empty, editable form.
	if (!product) error(404, 'Product not found.');


	const categories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories);

	// FIXED: join predicate now links the join table back to tags.id /
	// productCategories.id — previously it only filtered on productId, which
	// returned every tag/category for any product that had at least one.
	const tagged = await db
		.selectDistinct({ value: tags.id, name: tags.name })
		.from(tags)
		.innerJoin(
			productTags,
			and(eq(productTags.tagId, tags.id), eq(productTags.productId, productId))
		);

	// products.categoryId is the product's one category — the same column the
	// shop filter, related products and /buy read.
	const categorized = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.id, product.categoryId));

	// Prefill the product edit form server-side, keyed to the `edit` schema.
	// `image` is deliberately left out — a file input can't be prefilled, and the
	// action only overwrites featuredImage when a new file is actually uploaded.
	// `errors: false` so an incomplete existing row doesn't render as red on open.
	const form = await superValidate(
		{
			productName: product.name,
			brand: product.brand ?? '',
			categoryId: product.categoryId,
			tag: tagged.map((t) => t.value),
			commission: Number(product.commission ?? 0),
			description: product.description ?? '',
			supplier: product.supplierId ?? null,
			reorderLevel: product?.reorderLevel ?? 0,
			soldBy: product?.soldBy ?? 'quantity',
			thickness: product?.thickness ?? '',
			width: product?.width ?? '',
			maxLength: product?.maxLength != null ? Number(product.maxLength) : null,
			maxLengthUnit: product?.maxLengthUnit ?? 'm',
			isLengthCustomizable: product?.isLengthCustomizable ?? false,
			minLength: product?.minLength != null ? Number(product.minLength) : null,
			lengthStep: product?.lengthStep != null ? Number(product.lengthStep) : null,
			coatingType: product?.coatingType ?? '',
			colorOptions: product?.colorOptions ?? '',
			sizeRange: product?.sizeRange ?? '',
			finish: product?.finish ?? ''
		},
		zod4(edit),
		{ errors: false }
	);

	return {
		product,
		form,
		categories,
		adjustForm,
		galleryEdit,
		supplierList,
		damagedForm,
		allCategories,
		images,
		allTags,
		tagged,
		categorized
	};
};