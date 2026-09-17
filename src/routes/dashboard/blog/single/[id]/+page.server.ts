import { superValidate, fail, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { setFlash } from 'sveltekit-flash-message/server';

import { edit, editGallery } from './schema';
import { db } from '$lib/server/db';
import { blog as products, blogGallery as productImages } from '$lib/server/db/schema';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { describeDbError } from '$lib/server/dbErrors';
import { parseIdParam } from '$lib/server/params';
import { uniqueBlogSlug } from '../../blogSlug.server';
import type { Actions } from './$types';

/** Best-effort removal — a failed unlink must never fail the request. */
const removeFiles = (names: (string | null | undefined)[]) =>
	Promise.all(
		[...new Set(names)]
			.filter((name): name is string => !!name)
			.map((name) => deleteUploadedFile(name).catch(() => {}))
	);

export const actions: Actions = {
	editProduct: async ({ request, locals, params }) => {
		const id = parseIdParam(params.id);
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check your form data.' },
				{ status: 400 }
			);
		}

		const { title, slug, category, image, excerpt, content } = form.data;
		let featuredImage: string | null = null;

		try {
			const [current] = await db
				.select({ featuredImage: products.featuredImage })
				.from(products)
				.where(eq(products.id, id))
				.limit(1);

			if (!current) {
				return message(
					form,
					{ type: 'error', text: 'That blog post no longer exists.' },
					{ status: 404 }
				);
			}

			const finalSlug = await uniqueBlogSlug(slug ?? '', title, id);
			featuredImage = image?.size ? await saveUploadedFile(image) : null;

			await db
				.update(products)
				.set({
					title,
					slug: finalSlug,
					categoryId: category,
					excerpt,
					content,
					...(featuredImage ? { featuredImage } : {}),
					updatedBy: locals?.user?.id
				})
				.where(eq(products.id, id));

			// The replaced featured image is no longer referenced.
			if (featuredImage && current.featuredImage !== featuredImage) {
				await removeFiles([current.featuredImage]);
			}

			form.data.slug = finalSlug;
			return message(form, {
				type: 'success',
				text:
					finalSlug === slug
						? 'Blog Updated Successfully'
						: `Blog Updated Successfully — its address is now /blogs/${finalSlug}`
			});
		} catch (err) {
			await removeFiles([featuredImage]);

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('blog edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Blog Update Failed.') },
				{ status: 500 }
			);
		}
	},

	delete: async ({ cookies, params }) => {
		const id = parseIdParam(params.id);

		try {
			const [post] = await db
				.select({ featuredImage: products.featuredImage })
				.from(products)
				.where(eq(products.id, id))
				.limit(1);

			if (!post) {
				setFlash({ type: 'error', message: 'That blog post no longer exists.' }, cookies);
				return fail(404);
			}

			const gallery = await db
				.select({ imageUrl: productImages.imageUrl })
				.from(productImages)
				.where(eq(productImages.blogId, id));

			// Gallery rows first: before migration 0012 blog_gallery.blog_id has no
			// ON DELETE CASCADE, so deleting the post alone fails. Explicit either way.
			await db.transaction(async (tx) => {
				await tx.delete(productImages).where(eq(productImages.blogId, id));
				await tx.delete(products).where(eq(products.id, id));
			});

			// Only after the commit — the files are now unreferenced.
			await removeFiles([post.featuredImage, ...gallery.map((row) => row.imageUrl)]);

			setFlash({ type: 'success', message: 'Blog Deleted Successfully!' }, cookies);
		} catch (err) {
			console.error('Error deleting Blog:', err);
			setFlash(
				{ type: 'error', message: describeDbError(err, 'Could not delete the blog post.') },
				cookies
			);
			return fail(500);
		}
	},

	editGallery: async ({ params, request }) => {
		const id = parseIdParam(params.id);
		const form = await superValidate(request, zod4(editGallery));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the gallery images.' },
				{ status: 400 }
			);
		}

		const { existing, gallery } = form.data;
		const uploaded: string[] = [];

		try {
			const previous = (
				await db
					.select({ imageUrl: productImages.imageUrl })
					.from(productImages)
					.where(eq(productImages.blogId, id))
					.orderBy(productImages.id)
			)
				.map((row) => row.imageUrl)
				.filter((url): url is string => !!url);

			// Only images this post already had can be "kept" — the list comes from
			// the browser, so anything else in it is ignored.
			const kept = existing
				.split(',')
				.map((value) => value.trim())
				.filter((value) => value && previous.includes(value));

			for (const file of gallery ?? []) {
				if (!file?.size) continue;
				uploaded.push(await saveUploadedFile(file));
			}

			const finalList = [...new Set([...kept, ...uploaded])];

			await db.transaction(async (tx) => {
				await tx.delete(productImages).where(eq(productImages.blogId, id));
				if (finalList.length > 0) {
					await tx
						.insert(productImages)
						.values(finalList.map((imageUrl) => ({ blogId: id, imageUrl })));
				}
			});

			// Images the admin removed are now unreferenced.
			await removeFiles(previous.filter((name) => !finalList.includes(name)));

			return message(form, { type: 'success', text: 'Gallery updated successfully!' });
		} catch (err) {
			await removeFiles(uploaded);

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('Error updating blog gallery:', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not update the gallery.') },
				{ status: 500 }
			);
		}
	}
};
