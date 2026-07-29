import { db } from '$lib/server/db';
import {
	user,
	roles,
	gallery,
	products,
	productCategories,
	blog,
	blogCategories,
	orderItems,
	testimonials
} from '$lib/server/db/schema';
import { eq, sql, desc, inArray, getTableColumns } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { fetchVariantRowsForProducts, assembleProductCard } from '$lib/server/product-listing';

const HOME_FEATURED_LIMIT = 9;

export const load: LayoutServerLoad = async ({ locals }) => {
	const currentUser = locals?.user;
	let roleName = ''; // Initialize with a default value

	// 1. Fetch the role name if a user exists
	if (currentUser) {
		const roleData = await db
			.select({ name: roles.name })
			.from(user)
			.leftJoin(roles, eq(user.roleId, roles.id))
			.where(eq(user.id, currentUser.id))
			.then((rows) => rows[0]);

		roleName = roleData?.name ?? '';
	}
	const images = await db.select().from(gallery);

	const imagesList = images.map((img) => img.imageUrl);

	// Rank active products by total ordered quantity (LEFT JOIN so products with zero
	// orders still show up, just ranked last) — a single join, no fan-out.
	const bestSellingRows = await db
		.select({
			productId: products.id,
			orderedQty: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`
		})
		.from(products)
		.leftJoin(orderItems, eq(orderItems.productId, products.id))
		.where(eq(products.isActive, true))
		.groupBy(products.id)
		.orderBy(desc(sql`coalesce(sum(${orderItems.quantity}), 0)`))
		.limit(HOME_FEATURED_LIMIT);

	const featuredIds = bestSellingRows.map((r) => r.productId);

	const featuredProductsData = featuredIds.length
		? await db
				.select({
					productId: products.id,
					productName: products.name,
					slug: products.slug,
					image: products.featuredImage,
					categoryName: productCategories.name,
					baseQuantity: products.quantity,
					brand: products.brand,
					coatingType: products.coatingType,
					thickness: products.thickness,
					width: products.width
				})
				.from(products)
				.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
				.where(inArray(products.id, featuredIds))
		: [];

	const featuredVariantRows = await fetchVariantRowsForProducts(featuredIds);

	// Re-order to match the best-selling rank (the IN query above doesn't preserve it)
	const productList = featuredIds
		.map((id) => featuredProductsData.find((p) => p.productId === id))
		.filter((p): p is (typeof featuredProductsData)[number] => p !== undefined)
		.map((p) => assembleProductCard(p, featuredVariantRows));

	const testimonialList = await db
		.select()
		.from(testimonials)
		.where(eq(testimonials.isApproved, true));

	const blogItems = await db
		.select({
			...getTableColumns(blog),
			category: blogCategories.name
		})
		.from(blog)
		.leftJoin(blogCategories, eq(blog.categoryId, blogCategories.id));

	return {
		roleName,
		user: currentUser,
		blogItems,
		testimonialList,
		imagesList,
		bestSelling: productList
	};
};
