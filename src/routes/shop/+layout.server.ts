import { db } from '$lib/server/db';
import {
	products,
	productCategories,
	prices,
	categoriesProducts,
	tags,
	productTags
} from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import { eq, sql, and, like, asc, count, gte, lte, inArray, min, max } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') || '';
	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const pageSize = 20;
	const offset = (page - 1) * pageSize;
	const minPrice = Number(url.searchParams.get('min')) || 0;
	const maxPrice = Number(url.searchParams.get('max')) || 1000000;
	const selectedCats = url.searchParams.get('categories')?.split(',').filter(Boolean) ?? [];
	const brands = url.searchParams.get('brands')?.split(',').filter(Boolean) ?? [];
	const tagName = url.searchParams.get('tags')?.split(',').filter(Boolean) ?? [];

	// Full where clause — used for the main product query (has joins)
	const whereClause = and(
		eq(products.isActive, true),
		search ? like(products.name, `%${search}%`) : undefined,
		gte(prices.price, minPrice),
		lte(prices.price, maxPrice),
		selectedCats.length > 0 ? inArray(productCategories.name, selectedCats) : undefined,
		brands.length > 0 ? inArray(products.brand, brands) : undefined,
		tagName.length > 0 ? inArray(tags.name, tagName) : undefined
	);

	const categories = await db
		.selectDistinct({ name: productCategories.name })
		.from(productCategories)
		.innerJoin(categoriesProducts, eq(categoriesProducts.categoryId, productCategories.id));

	const tagList = await db
		.selectDistinct({ name: tags.name })
		.from(tags)
		.innerJoin(productTags, eq(productTags.tagId, tags.id));

	const brandList = await db.selectDistinct({ name: products.brand }).from(products);

	const productsData = await db
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
		.where(whereClause)
		.groupBy(products.id, productCategories.name)
		.orderBy(asc(products.createdAt))
		.limit(pageSize)
		.offset(offset);

	const [totalResult] = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(eq(products.isActive, true));
	const [productCount] = await db
		.select({ count: count(products.id) })
		.from(products)
		.where(eq(products.isActive, true))
		.limit(1);

	const totalCount = totalResult.count;
	const totalPages = Math.ceil(totalCount / pageSize - 1);

	const productIds = productsData.map((p) => p.productId);
	let allPrices = [];
	if (productIds.length > 0) {
		allPrices = await db.select().from(prices).where(inArray(prices.productId, productIds)); // ✅ cleaner than raw sql`IN`
	}

	const [priceRange] = await db
		.select({
			minPrice: min(prices.price),
			maxPrice: max(prices.price)
		})
		.from(prices);

	const productList = productsData.map((p) => ({
		...p,
		priceList: allPrices
			.filter((price) => price.productId === p.productId)
			.map((price) => ({
				amount: price.amount,
				price: price.price
			}))
	}));

	return {
		productList,
		brandList,
		tagList,
		categories,
		productCount,
		priceRange,
		pagination: {
			currentPage: page,
			totalPages,
			totalCount,
			hasNextPage: page < totalPages,
			hasPrevPage: page > 1
		}
	};
};
