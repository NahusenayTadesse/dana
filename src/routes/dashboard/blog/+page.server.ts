import { db } from '$lib/server/db';
import { blog, blogCategories } from '$lib/server/db/schema';
import { getTableColumns, eq } from 'drizzle-orm';
import type { PageServerLoad } from '../$types';
export const load: PageServerLoad = async () => {
	// First, get products
	const eventList = await db
		.select({
			...getTableColumns(blog),
			category: blogCategories.name
		})
		.from(blog)
		.leftJoin(blogCategories, eq(blog.categoryId, blogCategories.id));

	return {
		eventList
	};
};
