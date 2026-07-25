import { db } from '$lib/server/db';
import {
    products,
    productCategories,
    prices
} from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import { eq, sql, and, like, asc, count, gte, lte, inArray } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ url }) => {
    // 1. Parse filter search queries out of the URL string
    const search = url.searchParams.get('search') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const pageSize = 20;
    const offset = (page - 1) * pageSize;

    // Technical Specifications and Filtering parameters
    const minThick = url.searchParams.get('minThick') || '';
    const maxThick = url.searchParams.get('maxThick') || '';
    const selectedColor = url.searchParams.get('color') || '';
    const selectedCats = url.searchParams.get('categories')?.split(',').filter(Boolean).map(Number) ?? [];
    const onlyAvailable = url.searchParams.get('available') === 'true';

    // 2. Build the exact matching filter clause for the updated products table
    const whereClause = and(
        eq(products.isActive, true),
        search ? like(products.name, `%${search}%`) : undefined,
        minThick ? gte(products.thickness, minThick) : undefined,
        maxThick ? lte(products.thickness, maxThick) : undefined,
        selectedColor ? like(products.colorOptions, `%${selectedColor}%`) : undefined,
        selectedCats.length > 0 ? inArray(products.categoryId, selectedCats) : undefined,
        onlyAvailable ? gte(products.quantity, 1) : undefined
    );

    // Fetch lists dynamically to build your sidebar filters 
    const categoriesList = await db
        .select({ id: productCategories.id, name: productCategories.name })
        .from(productCategories)
        .where(eq(productCategories.isActive, true));

    // Get a unique array list of available custom color specs stored in the DB
    const colorRows = await db
        .select({ colors: products.colorOptions })
        .from(products)
        .where(eq(products.isActive, true));
        
    const uniqueColors = Array.from(
        new Set(
            colorRows
                .map((r) => r.colors)
                .filter(Boolean)
                .flatMap((c) => c!.split(',').map((s) => s.trim()))
        )
    );

    // 3. Query the main list of data matching the applied filters
    const productsData = await db
        .select({
            productId: products.id,
            productName: products.name,
            slug: products.slug,
            quantity: products.quantity,
            thickness: products.thickness,
            width: products.width,
            coatingType: products.coatingType,
            colorOptions: products.colorOptions,
            finish: products.finish,
            image: products.featuredImage,
            categoryId: products.categoryId,
            categoryName: productCategories.name,
            // Sub-query references for base metrics
            minPrice: sql<number>`min(${prices.price})`,
            minAmount: sql<number>`min(${prices.variant})`
        })
        .from(products)
        .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
        .leftJoin(prices, eq(prices.productId, products.id))
        .where(whereClause)
        .groupBy(products.id, productCategories.name)
        .orderBy(asc(products.createdAt))
        .limit(pageSize)
        .offset(offset);

    // 4. Calculate total dynamic filter matches for pagination controls
    const [countResult] = await db
        .select({ count: count(products.id) })
        .from(products)
        .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
        .where(whereClause);

    const totalCount = countResult?.count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    // 5. Query full sub-price range arrays matching retrieved IDs
    const productIds = productsData.map((p) => p.productId);
    let pricingLookups = [];
    if (productIds.length > 0) {
        pricingLookups = await db
            .select()
            .from(prices)
            .where(inArray(prices.productId, productIds));
    }

    // Merge lookups cleanly back onto the base structural data loop
    const productList = productsData.map((p) => ({
        ...p,
        priceList: pricingLookups
            .filter((price) => price.productId === p.productId)
            .map((price) => ({
                amount: price.amount,
                price: price.price
            }))
    }));

    return {
        productList,
        categoriesList,
        uniqueColors,
        pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};