import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from './schema';
import { db } from '$lib/server/db';
import {
	blogCategories,
	blog as inventory,
	blogGallery as productImages
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { redirect } from 'sveltekit-flash-message/server';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { describeDbError } from '$lib/server/dbErrors';
import { uniqueBlogSlug } from '../blogSlug.server';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));

	const cats = await db
		.select({
			value: blogCategories.id,
			name: blogCategories.name
		})
		.from(blogCategories);

	return {
		form,
		cats
	};
};

export const actions: Actions = {
	addBlog: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check your form data.' },
				{ status: 400 }
			);
		}

		const { title, category, slug, image, gallery, content, excerpt } = form.data;

		// Every file written during this request, so a failure can remove them.
		const uploaded: string[] = [];
		let newBlogId: number;

		try {
			// Uploads happen before the transaction so slow disk I/O doesn't hold
			// a DB connection open. Sequential, so `uploaded` always knows about
			// every file that made it to disk.
			const featuredImage = await saveUploadedFile(image);
			uploaded.push(featuredImage);

			const galleryImages: string[] = [];
			for (const file of gallery ?? []) {
				if (!file?.size) continue;
				const name = await saveUploadedFile(file);
				uploaded.push(name);
				galleryImages.push(name);
			}

			const finalSlug = await uniqueBlogSlug(slug ?? '', title);

			newBlogId = await db.transaction(async (tx) => {
				const [post] = await tx
					.insert(inventory)
					.values({
						title,
						slug: finalSlug,
						categoryId: category,
						content,
						excerpt,
						featuredImage,
						createdBy: locals?.user?.id
					})
					.$returningId();

				if (galleryImages.length > 0) {
					await tx
						.insert(productImages)
						.values(galleryImages.map((imageUrl) => ({ blogId: post.id, imageUrl })));
				}

				return post.id;
			});
		} catch (err) {
			// Nothing references these files any more.
			await Promise.all(uploaded.map((name) => deleteUploadedFile(name).catch(() => {})));

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('blog add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add the blog post.') },
				{ status: 500 }
			);
		}

		// Outside the try: redirect() throws, and must not be caught as a failure.
		redirect(
			`/dashboard/blog/single/${newBlogId}`,
			{ type: 'success', message: 'New Blog Successfully Added' },
			cookies
		);
	}
};
