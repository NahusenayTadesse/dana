import { db } from '$lib/server/db';
import {
	user,
	roles,
	gallery,
	products,
	productCategories,
	productTags,
	blog,
	blogCategories,
	tags,
	categoriesProducts,
	orderItems,
	prices,
	testimonials
} from '$lib/server/db/schema';
import { eq, sql, desc, sum, inArray, getTableColumns } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

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

	const bestSelling = await db
		.select({
			productId: products.id,
			brand: products.brand,
			productName: products.name,
			price: sql<number>`min(${prices.price})`,
			amount: sql<number>`min(${prices.amount})`,
			image: products.featuredImage,
			category: productCategories.name
		})
		.from(products)
		.leftJoin(categoriesProducts, eq(categoriesProducts.productId, products.id))
		.leftJoin(productCategories, eq(productCategories.id, categoriesProducts.categoryId))
		.leftJoin(productTags, eq(productTags.productId, products.id))
		.leftJoin(tags, eq(tags.id, productTags.tagId))
		.leftJoin(prices, eq(prices.productId, products.id))
		.leftJoin(orderItems, eq(orderItems.productId, products.id))
		.groupBy(products.id)
		.orderBy(desc(sum(orderItems.quantity)))
		.limit(10);

	const productIds = bestSelling.map((p) => p.productId);
	let allPrices = [];
	if (productIds.length > 0) {
		allPrices = await db.select().from(prices).where(inArray(prices.productId, productIds)); // ✅ cleaner than raw sql`IN`
	}

	const productList = bestSelling.map((p) => ({
		...p,
		priceList: allPrices
			.filter((price) => price.productId === p.productId)
			.map((price) => ({
				amount: price.amount,
				price: price.price
			}))
	}));

	const testimonialList = await db
		.select({
			name: testimonials.name,
			position: testimonials.position,
			testimonial: testimonials.message,
			avatar: testimonials.avatar
		})
		.from(testimonials);

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
