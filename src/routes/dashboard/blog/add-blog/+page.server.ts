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
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';

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

import { saveUploadedFile } from '$lib/server/upload.js';

export const actions: Actions = {
	addBlog: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(add));
		console.log(form);

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return message(form, { type: 'error', text: 'Please check your form data.' });
		}

		const { title, category, slug, image, gallery, content, excerpt } = form.data;

		const result = await db.transaction(async (tx) => {
			// 1. Upload images first (usually done before the DB transaction starts
			// to avoid keeping a DB connection open during slow network I/O)
			const featuredImage = await saveUploadedFile(image);
			const galleryImages = gallery ? await uploadGallery(gallery) : [];

			let newSlug: string;

			const existingSlug = await tx
				.select({ slug: inventory.slug })
				.from(inventory)
				.where(eq(inventory.slug, slug))
				.limit(1);

			if (existingSlug.length > 0) {
				newSlug = slug + '-1';
			} else {
				newSlug = slug;
			}

			// 2. Insert the main product
			const [product] = await tx
				.insert(inventory)
				.values({
					title,
					slug: newSlug,
					categoryId: category,
					gallery,
					content,
					excerpt,
					featuredImage,
					createdBy: locals?.user?.id
				})
				.$returningId();

			const newProductId = product.id;

			// 3. Prepare and insert the gallery images
			if (galleryImages.length > 0) {
				const imageRecords = galleryImages.map((url) => ({
					blogId: newProductId,
					imageUrl: url
				}));

				await tx.insert(productImages).values(imageRecords);
			}

			// Return the ID or the full object if needed
			return newProductId;
		});

		if (!result) {
			return message(
				form,
				{
					type: 'error',
					text: 'An error occurred while adding the event.'
				},
				{ status: 500 }
			);
		} else {
			message(form, { type: 'success', text: 'New Blog Successfully Added' });
			redirect(
				`/dashboard/blog/single/${result}`,
				{ type: 'success', message: 'New Blog Successfully Added' },
				cookies
			);
		}
	}
};

const uploadGallery = async (gallery: File[] | undefined) => {
	try {
		// 1. Map each file to the upload promise
		const uploadPromises = gallery.map(async (file) => {
			const address = await saveUploadedFile(file);
			return address; // This is the string returned by your function
		});

		// 2. Wait for all uploads to complete and store results in an array
		const uploadedAddresses: string[] = await Promise.all(uploadPromises);

		console.log('All files uploaded:', uploadedAddresses);

		return uploadedAddresses;
	} catch (error) {
		console.error('Error uploading gallery:', error);
		throw error;
	}
};
