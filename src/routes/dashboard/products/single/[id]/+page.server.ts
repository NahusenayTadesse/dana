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
	productTags,
	colors,
	widths,
	thicknesses,
	lengths,
	productVariants
} from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';

import { saveUploadedFile } from '$lib/server/upload';
import type { Actions, PageServerLoad } from './$types';
import { addVariant, editVariant } from './variant.schema';

const specLabel = (
	value: string | number,
	unit: string,
	label: string | null
): string => (label ? label : `${Number(value)}${unit === 'gauge' ? ' ga' : unit}`);

export const load: PageServerLoad = async ({ params }) => {
	const productId = Number(params.id);

	const [colorRows, widthRows, thicknessRows, lengthRows, variants] = await Promise.all([
		db.select({ id: colors.id, name: colors.name, hexValue: colors.hexValue }).from(colors),
		db.select().from(widths).where(eq(widths.isActive, true)),
		db.select().from(thicknesses).where(eq(thicknesses.isActive, true)),
		db.select().from(lengths).where(eq(lengths.isActive, true)),
		// Variants for this product, joined to spec names for the table.
		db
			.select({
				id: productVariants.id,
				colorId: productVariants.colorId,
				widthId: productVariants.widthId,
				thicknessId: productVariants.thicknessId,
				lengthId: productVariants.lengthId,
				sku: productVariants.sku,
				price: productVariants.price,
				quantity: productVariants.quantity,
				reorderLevel: productVariants.reorderLevel,
				imageUrl: productVariants.imageUrl,
				colorName: colors.name,
				width: widths.value,
				widthUnit: widths.unit,
				thickness: thicknesses.value,
				thicknessUnit: thicknesses.unit,
				length: lengths.value,
				lengthUnit: lengths.unit
			})
			.from(productVariants)
			.leftJoin(colors, eq(productVariants.colorId, colors.id))
			.leftJoin(widths, eq(productVariants.widthId, widths.id))
			.leftJoin(thicknesses, eq(productVariants.thicknessId, thicknesses.id))
			.leftJoin(lengths, eq(productVariants.lengthId, lengths.id))
			.where(eq(productVariants.productId, productId))
	]);

	const addVariantForm = await superValidate(zod4(addVariant));
	const editVariantForm = await superValidate(zod4(editVariant));

	return {
		addVariantForm,
		editVariantForm,
		variants,
		colorItems: colorRows.map((c) => ({ value: c.id, name: c.name })),
		widthItems: widthRows.map((w) => ({ value: w.id, name: specLabel(w.value, w.unit, w.label) })),
		thicknessItems: thicknessRows.map((t) => ({
			value: t.id,
			name: specLabel(t.value, t.unit, t.label)
		})),
		lengthItems: lengthRows.map((l) => ({ value: l.id, name: specLabel(l.value, l.unit, l.label) }))
	};
};


function variantErrorMessage(err: unknown): string {
	const e = err as { code?: string; message?: string };
	const duplicate = e?.code === 'ER_DUP_ENTRY' || /duplicate entry/i.test(e?.message ?? '');
	if (!duplicate) return 'Unexpected error. Please try again.';
	return /sku/i.test(e?.message ?? '')
		? 'That SKU is already in use.'
		: 'A variant with this exact colour / width / thickness / length already exists.';
}
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
	},
	addVariant: async ({ request, params, locals }) => {
			const form = await superValidate(request, zod4(addVariant));
			if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' });
	
			const { colorId, widthId, thicknessId, lengthId, sku, price, quantity, reorderLevel, image } =
				form.data;
	
			const imageUrl = image && image.size > 0 ? await saveUploadedFile(image) : null;
	
			try {
				await db.insert(productVariants).values({
					productId: Number(params.id),
					colorId,
					widthId,
					thicknessId,
					lengthId,
					sku: sku || null,
					price: price != null ? String(price) : null,
					quantity,
					reorderLevel: reorderLevel ?? null,
					imageUrl,
					createdBy: locals?.user?.id // part of ...secureFields
				});
	
				return message(form, { type: 'success', text: 'Variant added successfully.' });
			} catch (err) {
				console.error('Error adding variant:', err);
				return message(
					form,
					{ type: 'error', text: variantErrorMessage(err) },
					{ status: 409 }
				);
			}
		},
	
		editVariant: async ({ request }) => {
			const form = await superValidate(request, zod4(editVariant));
			if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' });
	
			const {
				id,
				colorId,
				widthId,
				thicknessId,
				lengthId,
				sku,
				price,
				quantity,
				reorderLevel,
				image
			} = form.data;
	
			// Only overwrite the image if a new one was actually uploaded.
			const newImageUrl = image && image.size > 0 ? await saveUploadedFile(image) : undefined;
	
			try {
				await db
					.update(productVariants)
					.set({
						colorId,
						widthId,
						thicknessId,
						lengthId,
						sku: sku || null,
						price: price != null ? String(price) : null,
						quantity,
						reorderLevel: reorderLevel ?? null,
						...(newImageUrl ? { imageUrl: newImageUrl } : {})
					})
					.where(eq(productVariants.id, id));
	
				return message(form, { type: 'success', text: 'Variant updated successfully.' });
			} catch (err) {
				console.error('Error updating variant:', err);
				return message(
					form,
					{ type: 'error', text: variantErrorMessage(err) },
					{ status: 409 }
				);
			}
		},
	
		deleteVariant: async ({ request }) => {
			// Shares the edit form (only needs the id).
			const form = await superValidate(request, zod4(editVariant));
			if (!form.valid) return message(form, { type: 'error', text: 'Invalid form data.' });
	
			const { id } = form.data;
	
			try {
				await db.delete(productVariants).where(eq(productVariants.id, id));
				return message(form, { type: 'success', text: 'Variant deleted successfully.' });
			} catch (err) {
				console.error('Error deleting variant:', err);
				return message(form, { type: 'error', text: `Unexpected error.` }, { status: 500 });
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