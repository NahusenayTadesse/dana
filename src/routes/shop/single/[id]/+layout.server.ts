import { db } from '$lib/server/db';
import {
    productCategories,
    products,
    prices,
    productImages
} from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ params }) => {
    const { id } = params;
    const numericId = Number(id);

    if (isNaN(numericId)) {
        error(400, 'Invalid product identification parameter.');
    }

    // 1. Fetch the gallery images bound to the given product
    const imageRows = await db
        .select({ url: productImages.imageUrl })
        .from(productImages)
        .where(eq(productImages.productId, numericId));
    const images = imageRows.map((img) => img.url);

    // 2. Fetch the fully mapped single product record matching the new layout schema
    const product = await db
        .select({
            id: products.id,
            name: products.name,
            slug: products.slug,
            brand: products.brand,
            categoryId: products.categoryId,
            categoryName: productCategories.name,
            featuredImage: products.featuredImage,
            description: products.description,
            overview: products.overview,
            quantity: products.quantity,
            commissionAmount: products.commissionAmount,
            supplierId: products.supplierId,
            reorderLevel: products.reorderLevel,
            thickness: products.thickness,
            width: products.width,
            coatingType: products.coatingType,
            colorOptions: products.colorOptions,
            sizeRange: products.sizeRange,
            finish: products.finish,
            performanceFeatures: products.performanceFeatures,
            advantages: products.advantages,
            applications: products.applications,
            isFeaturedOnHome: products.isFeaturedOnHome
        })
        .from(products)
        .leftJoin(productCategories, eq(productCategories.id, products.categoryId))
        .where(eq(products.id, numericId))
        .then((rows) => rows[0]);

    if (!product) {
        error(404, 'Product not found');
    }

    // 3. Extract pricing structural matrix variations
    const priceList = await db
        .select({
            amount: prices.amount,
            price: sql<number>`CAST(${prices.price} AS DOUBLE)`
        })
        .from(prices)
        .where(eq(prices.productId, numericId));

    // 4. Fetch related cross-sell products from the exact same category cluster
    const relatedProducts = await db
        .select({
            id: products.id,
            name: products.name,
            featuredImage: products.featuredImage,
            thickness: products.thickness
        })
        .from(products)
        .where(
            sql`${products.categoryId} = ${product.categoryId} AND ${products.id} != ${numericId} AND ${products.isActive} = true`
        )
        .limit(3);

    return {
        product,
        priceList,
        images,
        relatedProducts
    };
};