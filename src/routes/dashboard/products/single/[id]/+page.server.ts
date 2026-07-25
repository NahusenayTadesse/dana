import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { edit, adjust, damaged, editGallery, editPrice, addPrice } from './schema';

import { db } from '$lib/server/db';
import {
	products,
	productImages,
	productAdjustments,
	damagedProducts,
	prices as priceList,
	transactions,
	categoriesProducts,
	productTags
} from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';

import { saveUploadedFile } from '$lib/server/upload';
import type { Actions } from './$types';

export const actions: Actions = {
	editProduct: async ({ request, cookies, locals, params }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return fail(400, { form });
		}

		const {
			productName,
			brand,
			category,
			tag,
			commission,
			description,
			quantity,
			supplier,
			reorderLevel,
			image
		} = form.data;

		try {
			const featuredImage = image ? await saveUploadedFile(image) : undefined;

			await db.transaction(async (tx) => {
				await tx
					.update(products)
					.set({
						name: productName,
						description,
						brand,
						quantity,
						commissionAmount: String(commission),
						supplierId: supplier ? supplier : null,
						reorderLevel,
						updatedBy: locals?.user?.id,
						...(featuredImage ? { featuredImage } : {})
					})
					.where(eq(products.id, Number(id)));

				// Re-sync categories (wipe + reinsert)
				await tx.delete(categoriesProducts).where(eq(categoriesProducts.productId, Number(id)));
				if (category && category.length > 0) {
					await tx.insert(categoriesProducts).values(
						category.map((categoryId) => ({
							productId: Number(id),
							categoryId,
							createdBy: locals?.user?.id
						}))
					);
				}

				// Re-sync tags (wipe + reinsert)
				await tx.delete(productTags).where(eq(productTags.productId, Number(id)));
				if (tag && tag.length > 0) {
					await tx.insert(productTags).values(
						tag.map((tagId) => ({
							productId: Number(id),
							tagId
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Product Updated Successfully' });
		} catch (err) {
			console.error(err?.message);
			return message(form, { type: 'error', text: 'Product Update Failed ' + err?.message });
		}
	},

	adjust: async ({ request, cookies, params, locals }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(adjust));

		const { intent, quantity, reason, reciept } = form.data;

		try {
			if (!id) {
				setFlash({ type: 'error', message: 'Unexpected Error: Product ID not provided' }, cookies);
				return fail(400, { form });
			}

			const adjustment = intent === 'add' ? Number(quantity) : -Number(quantity);

			if (reciept) {
				const recieptLink = await saveUploadedFile(reciept);

				const [transactionId] = await db
					.insert(transactions)
					.values({
						amount: String(adjustment), // decimal column -> string
						recieptLink,
						createdBy: locals.user?.id
					})
					.$returningId();

				await db.insert(productAdjustments).values({
					productsId: Number(id),
					adjustment,
					reason,
					transactionId: transactionId.id,
					createdBy: locals.user?.id
				});
			} else {
				await db.insert(productAdjustments).values({
					productsId: Number(id), // was `id` (string) -> int column
					adjustment,
					reason,
					createdBy: locals.user?.id
				});
			}

			await db
				.update(products)
				.set({
					quantity: sql`quantity + ${adjustment}`,
					updatedBy: locals.user?.id
				})
				.where(eq(products.id, Number(id)));

			return message(form, { type: 'success', text: 'Product Updated Successfully' });
		} catch (err) {
			return message(form, { type: 'error', text: 'Unexpected Error' + err?.message });
		}
	},

	delete: async ({ cookies, params }) => {
		const { id } = params;

		try {
			if (!id) {
				setFlash({ type: 'error', message: 'Unexpected Error: Product ID not provided' }, cookies);
				return fail(400);
			}

			await db.delete(products).where(eq(products.id, Number(id)));

			setFlash({ type: 'success', message: 'Product Deleted Successfully!' }, cookies);
		} catch (err) {
			console.error('Error deleting product:', err);
			setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
			return fail(400);
		}
	},

	damaged: async ({ params, locals, request }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(damaged));

		const { quantity, damagedBy, reason } = form.data;

		try {
			if (!id) {
				return message(form, { type: 'error', text: 'Unexpected Error: Product ID not provided' });
			}

			await db.transaction(async (tx) => {
				await tx.insert(damagedProducts).values({
					productId: Number(id),
					quantity: Number(quantity),
					createdBy: locals.user?.id,
					damagedBy,
					reason
				});

				await tx
					.update(products)
					.set({
						quantity: sql`quantity - ${Number(quantity)}`,
						updatedBy: locals.user?.id
					})
					.where(eq(products.id, Number(id)));
			});

			return message(form, { type: 'success', text: 'Damaged supply added Successfully!' });
		} catch (err) {
			console.error('Error adding damaged supply:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	},

	editGallery: async ({ params, locals, request }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(editGallery));

		const { existing, gallery } = form.data;

		try {
			if (!id) {
				return message(form, { type: 'error', text: 'Unexpected Error: Product ID not provided' });
			}

			await db.transaction(async (tx) => {
				let galleryImages: string[] = [];

				if (gallery && gallery.length > 0) {
					galleryImages = await uploadGallery(gallery);
				}

				const old = existing ? existing.split(',') : [];
				const finalList = [...new Set([...old, ...galleryImages])].filter(
					(item) => item && item.trim() !== ''
				);

				await tx.delete(productImages).where(eq(productImages.productId, Number(id)));

				if (finalList.length > 0) {
					await tx.insert(productImages).values(
						finalList.map((url) => ({
							productId: Number(id),
							imageUrl: url
						}))
					);
				}
			});

			return message(form, { type: 'success', text: 'Product Gallery added Successfully!' });
		} catch (err) {
			console.error('Error adding product gallery:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	},

	editPrice: async ({ request }) => {
		const form = await superValidate(request, zod4(editPrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { id, price, amount, image } = form.data;

		try {
			if (image) {
				const imageUrl = await saveUploadedFile(image);
				await db
					.update(priceList)
					.set({ price: String(price), amount, imageUrl })
					.where(eq(priceList.id, id));
			} else {
				await db
					.update(priceList)
					.set({ price: String(price), amount })
					.where(eq(priceList.id, id));
			}

			return message(form, { type: 'success', text: 'Product Price updated Successfully!' });
		} catch (err) {
			console.error('Error editing product price:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	},

	addPrice: async ({ request, params }) => {
		const form = await superValidate(request, zod4(addPrice));
		const { id } = params;

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { price, amount, image } = form.data;

		try {
			const imageUrl = image ? await saveUploadedFile(image) : null;
			await db.insert(priceList).values({
				productId: Number(id),
				price: String(price),
				amount,
				imageUrl
			});

			return message(form, { type: 'success', text: 'Product Price added Successfully!' });
		} catch (err) {
			console.error('Error adding product price:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	},

	deletePrice: async ({ request }) => {
		const form = await superValidate(request, zod4(editPrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' });
		}

		const { id, price, amount } = form.data;

		try {
			await db.delete(priceList).where(eq(priceList.id, id));

			return message(form, {
				type: 'success',
				text: `Variant ${amount} with ${price} price deleted Successfully!`
			});
		} catch (err) {
			console.error('Error deleting Variant price:', err);
			return message(form, { type: 'error', text: `Unexpected Error: ${err?.message}` });
		}
	}
};

const uploadGallery = async (gallery: File[]): Promise<string[]> => {
	try {
		const uploadPromises = gallery.map((file) => saveUploadedFile(file));
		return await Promise.all(uploadPromises);
	} catch (error) {
		console.error('Error uploading gallery:', error);
		throw error;
	}
};