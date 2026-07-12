import { db } from '$lib/server/db';
import {
	blog as portfolio,
	blogGallery as portfolioGallery,
	blogCategories
} from '$lib/server/db/schema';
import { eq, getTableColumns } from 'drizzle-orm';

import type { PageServerLoad } from '../$types';
export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;
	// First, get products
	const portfolioItems = await db
		.select({
			...getTableColumns(portfolio),
			category: blogCategories.name
		})
		.from(portfolio)
		.innerJoin(blogCategories, eq(portfolio.categoryId, blogCategories.id))
		.where(eq(portfolio.slug, id))
		.limit(1)
		.then((res) => res[0]);

	const result = await db
		.select({
			url: portfolioGallery.imageUrl
		})
		.from(portfolioGallery)

		.where(eq(portfolioGallery.blogId, portfolioItems.id));

	const images = result.map((img) => img.url);

	return {
		portfolioItems,
		images
	};
};
