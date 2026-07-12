import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { edit, adjust, damaged, editGallery, editPrice, addPrice } from './schema';

import { db } from '$lib/server/db';
import {
	productCategories,
	products,
	user,
	productSuppliers as suppliers,
	orderItems,
	orders,
	prices,
	productImages,
	tags,
	productTags,
	categoriesProducts
} from '$lib/server/db/schema';
import { eq, and, sql, isNotNull, desc, min } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const { id } = params;
	const form = await superValidate(zod4(edit));
	const adjustForm = await superValidate(zod4(adjust));
	const damagedForm = await superValidate(zod4(damaged));
	const galleryEdit = await superValidate(zod4(editGallery));
	const priceEdit = await superValidate(zod4(editPrice));
	const priceAdd = await superValidate(zod4(addPrice));

	const allCategories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.isActive, true));
	const allTags = await db
		.select({
			value: tags.id,
			name: tags.name
		})
		.from(tags);

	const supplierList = await db
		.select({
			value: suppliers.id,
			name: suppliers.name
		})
		.from(suppliers)
		.where(eq(suppliers.isActive, true));

	const result = await db
		.select({
			url: productImages.imageUrl
		})
		.from(productImages)
		.where(eq(productImages.productId, Number(id)));

	const images = result.map((img) => img.url);

	const product = await db
		.select({
			id: products.id,
			name: products.name,
			price: min(prices.price),
			brand: products.brand,
			description: products.description,
			quantity: products.quantity,
			reorderLevel: products.reorderLevel,
			supplier: suppliers.name,
			supplierId: suppliers.id,
			image: products.featuredImage,
			saleCount: sql<number>`SUM(${orderItems.quantity})`,
			createdBy: user.name,
			createdAt: sql<string>`DATE_FORMAT(${products.createdAt}, '%Y-%m-%d')`
		})
		.from(products)
		.leftJoin(prices, eq(prices.productId, products.id))
		.leftJoin(suppliers, eq(suppliers.id, products.supplierId))
		.leftJoin(orderItems, eq(products.id, orderItems.productId))
		.leftJoin(orders, and(eq(orderItems.orderId, orders.id), eq(orders.status, 'delivered')))
		.leftJoin(user, eq(products.createdBy, user.id))
		.where(eq(products.id, Number(id)))
		.groupBy(
			products.id,
			products.name,
			prices.price,
			orderItems.quantity,
			products.description,
			products.quantity,
			suppliers.name,
			products.reorderLevel
		)
		.then((rows) => rows[0]);

	const priceList = await db
		.select({
			id: prices.id,
			amount: prices.amount,
			price: sql<number>`CAST(${prices.price} AS DOUBLE)`
		})
		.from(prices)
		.where(eq(prices.productId, Number(id)));

	const categories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories);

	const tagged = await db
		.selectDistinct({
			value: tags.id,
			name: tags.name
		})
		.from(tags)
		.innerJoin(productTags, eq(productTags.productId, Number(id)));
	const categorized = await db
		.selectDistinct({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.innerJoin(categoriesProducts, eq(categoriesProducts.productId, Number(id)));

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
		priceList,
		priceEdit,
		priceAdd,
		allTags,
		tagged,
		categorized
	};
};
