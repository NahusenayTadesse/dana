import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { edit, editGallery } from './schema';

import { db } from '$lib/server/db';
import { blog as products, blogGallery as productImages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';

import { saveUploadedFile } from '$lib/server/upload';
import type { Actions } from './$types';

export const actions: Actions = {
	editProduct: async ({ request, cookies, locals, params }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(edit));
		console.log(form.data);

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return fail(400, { form });
		}

		const { title, slug, category, image, excerpt, content } = form.data;

		try {
			if (image) {
				const featuredImage = await saveUploadedFile(image);

				await db
					.update(products)
					.set({
						title,
						slug,
						categoryId: category,
						excerpt,
						content,
						featuredImage,
						updatedBy: locals?.user?.id
					})
					.where(eq(products.id, Number(id)));
			} else {
				await db
					.update(products)
					.set({
						title,
						slug,
						categoryId: category,
						excerpt,
						content,

						updatedBy: locals?.user?.id
					})
					.where(eq(products.id, Number(id)));
			}

			return message(form, { type: 'success', text: 'Blog Updated Successfully' });
		} catch (err) {
			console.error(err?.message);

			return message(form, { type: 'error', text: 'Blog Update Failed' + err?.message });
		}
	},

	delete: async ({ cookies, params }) => {
		const { id } = params;

		try {
			if (!id) {
				setFlash({ type: 'error', message: 'Unexpected Error: Blog ID not provided' }, cookies);
				return fail(400);
			}

			await db.delete(products).where(eq(products.id, Number(id)));

			setFlash({ type: 'success', message: 'Blog Deleted Successfully!' }, cookies);
		} catch (err) {
			console.error('Error deleting Blog:', err);
			setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
			return fail(400);
		}
	},

	editGallery: async ({ params, request }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(editGallery));

		const { existing, gallery } = form.data;

		try {
			if (!id) {
				return message(
					form,
					{ type: 'error', text: 'Unexpected Error: Blog ID not provided' },
					{ status: 500 }
				);
			}

			await db.transaction(async (tx) => {
				let galleryImages: string[] = [];

				// 1. Upload new files if they exist
				if (gallery && gallery.length > 0) {
					galleryImages = await uploadGallery(gallery);
				}
				const old = existing.split(',');
				// 2. Combine existing (edited) strings with newly uploaded URLs
				// We filter out empty strings/nulls to ensure data integrity
				const finalList = [...new Set([...old, ...galleryImages])].filter(
					(item) => item && item.trim() !== ''
				);

				// 3. ALWAYS sync if the final list is valid,
				// even if galleryImages.length is 0 (e.g., you just deleted an old photo)
				if (finalList.length > 0) {
					const imageRecords = finalList.map((url) => ({
						blogId: Number(id),
						imageUrl: url
					}));

					// Wipe the old associations and replace with the new "finalList"
					await tx.delete(productImages).where(eq(productImages.blogId, Number(id)));
					await tx.insert(productImages).values(imageRecords);
				} else {
					// Handle the case where all images were removed
					await tx.delete(productImages).where(eq(productImages.blogId, Number(id)));
				}
			});

			return message(form, { type: 'success', text: 'Blog added Successfully!' });
		} catch (err) {
			console.error('Error marking adding blog gallery:', err);
			return message(
				form,
				{ type: 'error', text: `Unexpected Error: ${err?.message}` },
				{ status: 500 }
			);
		}
	}
};

const uploadGallery = async (gallery: File[]) => {
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
