import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from './schema';
import { db } from '$lib/server/db';
import {
    colors,
	products as inventory,
	lengths,
	productCategories,
	categoriesProducts,
	productImages,
	productSuppliers as suppliers,
    thicknesses,
    widths
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { redirect } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { isDuplicateEntry, isMissingReference, describeDbError } from '$lib/server/dbErrors';
import { slugify } from '$lib/slug';

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
    }).from(colors).where(eq(colors.isActive, true));

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
			return message(form, { type: 'error', text: 'Please check your form data.' }, { status: 400 });
		}

		const {
			name,
			slug,
			brand,
			categoryId,
			description,
			overview,
			commissionAmount,
			supplierId,
			reorderLevel,
			soldBy,
			thickness,
			width,
			maxLength,
			maxLengthUnit,
			isLengthCustomizable,
			minLength,
			lengthStep,
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

		// A URL-safe slug, whatever was typed. slugify() returns '' for a name with
		// no Latin letters or digits (e.g. Amharic), so fall back to a random one.
		const finalSlug =
			slugify(slug ?? '') || slugify(name) || `product-${randomUUID().slice(0, 8)}`;

		// Files written so far — removed again if anything below fails, so a
		// rejected product doesn't leave uploads on disk with nothing pointing at them.
		const uploaded: string[] = [];
		let newProductId: number;
		try {
			// Uploads stay outside the transaction to keep DB locks short, but
			// inside the try so a rejected file is a message, not a 500 page.
			// Empty (0-byte) File objects are already dropped by the schema.
			const featuredImage = image ? await saveUploadedFile(image) : null;
			if (featuredImage) uploaded.push(featuredImage);
			for (const file of gallery ?? []) {
				uploaded.push(await saveUploadedFile(file));
			}
			const galleryImages = uploaded.filter((f) => f !== featuredImage);

			newProductId = await db.transaction(async (tx) => {
				const [product] = await tx
					.insert(inventory)
					.values({
						name,
						slug: finalSlug,
						brand: brand ?? null,
						// products.categoryId is the product's category everywhere
						// (shop filter, related products, /buy, admin list).
						categoryId,
						description: description ?? null,
						overview: overview ?? null,
						// quantity is left at its default 0: stock is the synced total
						// of the variants' warehouse rows ($lib/server/stock).
						commissionAmount,
						supplierId: supplierId ?? null,
						reorderLevel: reorderLevel ?? null,
						soldBy,
						thickness: thickness ?? null,
						width: width ?? null,
						maxLength: maxLength != null ? String(maxLength) : null,
						maxLengthUnit,
						isLengthCustomizable,
						minLength: minLength != null ? String(minLength) : null,
						lengthStep: lengthStep != null ? String(lengthStep) : null,
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

				// Mirror of products.categoryId, kept for anything still reading
				// the join table — edit keeps it in sync the same way.
				await tx.insert(categoriesProducts).values({
					productId: product.id,
					categoryId,
					createdBy: locals?.user?.id
				});

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
			await Promise.all(
				uploaded.map((file) =>
					deleteUploadedFile(file).catch((cleanupErr) =>
						console.error('Failed to clean up upload:', cleanupErr)
					)
				)
			);

			if (e instanceof UploadError) {
				return message(form, { type: 'error', text: e.message }, { status: 400 });
			}
			// Friendly message for the most common cause: the unique slug clashing.
			// (Drizzle wraps the MySQL error, so check the cause chain, not err.code.)
			if (isDuplicateEntry(e)) {
				return message(
					form,
					{
						type: 'error',
						text: `A product with the slug "${finalSlug}" already exists — choose a different slug.`
					},
					{ status: 409 }
				);
			}
			if (isMissingReference(e)) {
				return message(
					form,
					{ type: 'error', text: 'The selected category or supplier no longer exists. Reload and try again.' },
					{ status: 400 }
				);
			}

			return message(
				form,
				{ type: 'error', text: describeDbError(e, 'An error occurred while adding the product.') },
				{ status: 500 }
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
