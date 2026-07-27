import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from './schema';
import { db } from '$lib/server/db';
import {
    colors,
	products as inventory,
	lengths,
	productCategories,
	productImages,
	productSuppliers as suppliers,
    thicknesses,
    widths
} from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';
import { saveUploadedFile } from '$lib/server/upload.js';

export const load: PageServerLoad = async () => {
	const allCategories = await db
		.select({
			value: productCategories.id,
			name: productCategories.name,
			description: productCategories.description
		})
		.from(productCategories)
		.where(eq(productCategories.isActive, true));


	const widthList = await db
		.select({
			value: widths.id,
			name: widths.label
        		})
		.from(widths)
		.where(eq(widths.isActive, true));

      const thicknessList = await db
       .select({
           value: thicknesses.id,
           name: thicknesses.label
               })
       .from(thicknesses)
       .where(eq(thicknesses.isActive, true));
       
  
          const lengthList = await db
       .select({
           value: lengths.id,
           name: lengths.label
               })
       .from(lengths)
       .where(eq(lengths.isActive, true));


    	const supplierList = await db
		.select({
			value: suppliers.id,
			name: suppliers.name
		})
		.from(suppliers)
		.where(eq(suppliers.isActive, true));

    const colorList = await db.select({
         value: colors.id,
         name: colors.name
    }).from(colors);

	const form = await superValidate(zod4(add));

	return {
		form,
		allCategories,
		supplierList,
        colorList,
        thicknessList,
        lengthList,
        widthList
	};
};

export const actions: Actions = {
	addProduct: async ({ request, cookies, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return message(form, { type: 'error', text: 'Please check your form data.' });
		}

		const {
			name,
			slug,
			brand,
			categoryId,
			description,
			overview,
			quantity,
			commissionAmount,
			supplierId,
			reorderLevel,
			thickness,
			width,
			coatingType,
			colorOptions,
			sizeRange,
			finish,
			performanceFeatures,
			advantages,
			applications,
			isFeaturedOnHome,
			image,
			gallery
		} = form.data;

		// Process uploads outside the transaction to keep DB locks short.
		// Guard against empty (0-byte) File objects that empty inputs can produce.
		const featuredImage = image && image.size > 0 ? await saveUploadedFile(image) : null;
		const galleryImages = await uploadGallery(gallery);

		let newProductId: number;
		try {
			newProductId = await db.transaction(async (tx) => {
				const [product] = await tx
					.insert(inventory)
					.values({
						name,
						slug,
						brand: brand ?? null,
						categoryId,
						description: description ?? null,
						overview: overview ?? null,
						quantity,
						commissionAmount,
						supplierId: supplierId ?? null,
						reorderLevel: reorderLevel ?? null,
						thickness: thickness ?? null,
						width: width ?? null,
						coatingType: coatingType ?? null,
						colorOptions: colorOptions ?? null,
						sizeRange: sizeRange ?? null,
						finish: finish ?? null,
						performanceFeatures: performanceFeatures ?? null,
						advantages: advantages ?? null,
						applications: applications ?? null,
						isFeaturedOnHome,
						featuredImage,
						// createdBy is part of ...secureFields
						createdBy: locals?.user?.id
					})
					.$returningId();

				if (galleryImages.length > 0) {
					await tx.insert(productImages).values(
						galleryImages.map((url) => ({
							productId: product.id,
							imageUrl: url
						}))
					);
				}

				return product.id;
			});
		} catch (e: unknown) {
			console.error('Add product failed:', e);

			// Friendly message for the most common cause: the unique slug clashing.
			const err = e as { code?: string; message?: string };
			const duplicate =
				err?.code === 'ER_DUP_ENTRY' || /duplicate entry/i.test(err?.message ?? '');

			return message(
				form,
				{
					type: 'error',
					text: duplicate
						? 'A product with that slug already exists — choose a different slug.'
						: 'An error occurred while adding the product.'
				},
				{ status: duplicate ? 409 : 500 }
			);
		}

		// redirect() throws, so it must live outside the try/catch above.
		redirect(
			`/dashboard/products/single/${newProductId}`,
			{ type: 'success', message: 'New Product Successfully Added' },
			cookies
		);
	}
};

const uploadGallery = async (gallery: File[] | undefined): Promise<string[]> => {
	const files = (gallery ?? []).filter((file) => file && file.size > 0);
	if (files.length === 0) return [];

	try {
		return await Promise.all(files.map((file) => saveUploadedFile(file)));
	} catch (error) {
		console.error('Error uploading gallery:', error);
		throw error;
	}
};