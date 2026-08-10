import { db } from '$lib/server/db';
import {
	blog as portfolio,
	blogGallery as portfolioGallery,
	blogCategories
} from '$lib/server/db/schema';
import { eq, getTableColumns } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

// '../$types' is the PARENT route's types, where params has no `id` — so
// params.id was untyped here despite this being the [id] route.
import type { PageServerLoad } from './$types';
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

	// Unknown slug used to fall straight through to `portfolioItems.id` below
	// and throw a bare TypeError, so every stale or mistyped blog URL — and
	// anything a crawler had cached — returned a 500 instead of a 404.
	if (!portfolioItems) {
		error(404, 'That post could not be found.');
	}

	const result = await db
		.select({
			url: portfolioGallery.imageUrl
		})
		.from(portfolioGallery)

		.where(eq(portfolioGallery.blogId, portfolioItems.id));

	// imageUrl is nullable in the schema, and a null would render as a broken
	// <img src>. Drop the empty rows rather than pass them to the gallery.
	const images = result
		.map((img) => img.url)
		.filter((url): url is string => typeof url === 'string' && url.length > 0);

	return {
		portfolioItems,
		images
	};
};
