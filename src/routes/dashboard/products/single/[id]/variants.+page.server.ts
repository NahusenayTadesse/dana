import { error } from '@sveltejs/kit';
// Merge these load returns + actions into the single-product page's
// +page.server.ts. params.id is the product id.

import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { addVariant, editVariant } from './schema';
import { db } from '$lib/server/db';
import {
	productVariants,
	colors,
	widths,
	thicknesses,
	lengths
} from '$lib/server/db/schema';
import { saveUploadedFile } from '$lib/server/upload';
import type { Actions, PageServerLoad } from './$types';

// Readable label for a spec lookup row, e.g. "1000mm", "0.5mm", "26 ga".
const specLabel = (
	value: string | number,
	unit: string,
	label: string | null
): string => (label ? label : `${Number(value)}${unit === 'gauge' ? ' ga' : unit}`);

export const load: PageServerLoad = async ({ params }) => {
	const productId = Number(params.id);
	if (!Number.isInteger(productId)) error(404, 'Not found.');

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

// Turns the unique-index and unique-SKU collisions into friendly messages.
function variantErrorMessage(err: unknown): string {
	const e = err as { code?: string; message?: string };
	const duplicate = e?.code === 'ER_DUP_ENTRY' || /duplicate entry/i.test(e?.message ?? '');
	if (!duplicate) return 'Unexpected error. Please try again.';
	return /sku/i.test(e?.message ?? '')
		? 'That SKU is already in use.'
		: 'A variant with this exact colour / width / thickness / length already exists.';
}

export const actions: Actions = {
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
