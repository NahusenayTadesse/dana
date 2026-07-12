import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { edit, editGallery } from './schema';

import { db } from '$lib/server/db';
import {
	blog as event,
	blogGallery as productImages,
	blogCategories,
	user
} from '$lib/server/db/schema';
import { eq, sql, getTableColumns } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ params }) => {
	const { id } = params;

	const result = await db
		.select({
			url: productImages.imageUrl
		})
		.from(productImages)
		.where(eq(productImages.blogId, Number(id)));

	const images = result.map((img) => img.url);

	const cats = await db
		.select({
			value: blogCategories.id,
			name: blogCategories.name
		})
		.from(blogCategories);

	const product = await db
		.select({
			...getTableColumns(event),
			categoryName: blogCategories.name,
			category: blogCategories.id,
			createdBy: user.name
		})
		.from(event)
		.leftJoin(blogCategories, eq(event.categoryId, blogCategories.id))
		.leftJoin(user, eq(event.createdBy, user.id))
		.where(eq(event.id, Number(id)))
		.limit(1)
		.then((rows) => rows[0]);

	const form = await superValidate(product, zod4(edit));
	const galleryEdit = await superValidate(zod4(editGallery));

	return {
		product,
		form,
		images,
		galleryEdit,
		cats
	};
};
