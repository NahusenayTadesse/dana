import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from './schema';
import { db } from '$lib/server/db';
import {
    products as inventory,
    productCategories,
    categoriesProducts,
    productTags,
    tags,
    productImages,
    productSuppliers as suppliers
} from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
import { redirect, setFlash } from 'sveltekit-flash-message/server';
import { eq } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
    const allCategories = await db
        .select({
            value: productCategories.id,
            name: productCategories.name,
            description: productCategories.description
        })
        .from(productCategories)
        .where(eq(productCategories.isActive, true));
        
    const allTags = await db
        .select({
            value: tags.id,
            name: tags.name
        })
        .from(tags);
        
    const form = await superValidate(zod4(add));

    const supplierList = await db
        .select({
            value: suppliers.id,
            name: suppliers.name
        })
        .from(suppliers)
        .where(eq(suppliers.isActive, true));

    return {
        form,
        allCategories,
        supplierList,
        allTags
    };
};

import { saveUploadedFile } from '$lib/server/upload.js';

export const actions: Actions = {
    addProduct: async ({ request, cookies, locals }) => {
        const form = await superValidate(request, zod4(add));
        console.log(form);

        if (!form.valid) {
            setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
            return message(form, { type: 'error', text: 'Please check your form data.' });
        }

        // Destructure all updated schema elements
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

        // Process file uploads outside the transaction block to minimize open connection locks
        const featuredImage = image ? await saveUploadedFile(image) : null;
        let galleryImages: string[] = [];
        if (gallery) galleryImages = await uploadGallery(gallery);

        const result = await db.transaction(async (tx) => {
            // Insert the main product record matching Drizzle schema architecture keys
            const [product] = await tx
                .insert(inventory)
                .values({
                    name,
                    slug,
                    brand,
                    categoryId,
                    description,
                    overview,
                    quantity,
                    commissionAmount,
                    supplierId: supplierId || null,
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
                    featuredImage,
                    // Destructure hook for fields packed inside your database schema ...secureFields
                    createdBy: locals?.user?.id 
                })
                .$returningId();

            const newProductId = product.id;

            // Optional structural fallback to link junctions if tags are processed elsewhere in the future
            // (Keeping image gallery attachments bound properly to productImages table below)
            if (galleryImages.length > 0) {
                const imageRecords = galleryImages.map((url) => ({
                    productId: newProductId,
                    imageUrl: url
                }));

                await tx.insert(productImages).values(imageRecords);
            }

            return newProductId;
        });

        if (!result) {
            return message(
                form,
                {
                    type: 'error',
                    text: 'An error occurred while adding the product.'
                },
                { status: 500 }
            );
        } else {
            redirect(
                `/dashboard/products/single/${result}`,
                { type: 'success', message: 'New Product Successfully Added' },
                cookies
            );
        }
    }
};

const uploadGallery = async (gallery: File[] | undefined) => {
    if (!gallery) return [];
    try {
        const uploadPromises = gallery.map(async (file) => {
            const address = await saveUploadedFile(file);
            return address;
        });

        const uploadedAddresses: string[] = await Promise.all(uploadPromises);
        console.log('All gallery files uploaded:', uploadedAddresses);
        return uploadedAddresses;
    } catch (error) {
        console.error('Error uploading gallery:', error);
        throw error;
    }
};