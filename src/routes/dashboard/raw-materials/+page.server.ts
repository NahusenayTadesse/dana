import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, asc } from 'drizzle-orm';

import { addMaterial, editMaterial } from './schema';
import { db } from '$lib/server/db';
import { rawMaterials, productSuppliers } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import type { MaterialRow } from './types';

export const load: PageServerLoad = async () => {
	const [rows, suppliers] = await Promise.all([
		db
			.select({
				id: rawMaterials.id,
				name: rawMaterials.name,
				supplierId: rawMaterials.supplierId,
				supplierName: productSuppliers.name,
				unit: rawMaterials.unit,
				quantityOnHand: rawMaterials.quantityOnHand,
				reorderLevel: rawMaterials.reorderLevel,
				isActive: rawMaterials.isActive
			})
			.from(rawMaterials)
			.leftJoin(productSuppliers, eq(productSuppliers.id, rawMaterials.supplierId))
			.orderBy(asc(rawMaterials.name)),
		db
			.select({ value: productSuppliers.id, name: productSuppliers.name })
			.from(productSuppliers)
			.orderBy(asc(productSuppliers.name))
	]);

	const allData: MaterialRow[] = rows.map((row) => {
		const onHand = Number(row.quantityOnHand);
		const reorder = row.reorderLevel == null ? null : Number(row.reorderLevel);
		return {
			...row,
			quantityOnHand: onHand,
			reorderLevel: reorder,
			// Only a material with a reorder level can be "low" — without one there
			// is no threshold to be under, and flagging everything at zero would
			// make the column noise.
			stockState: reorder == null ? 'none' : onHand <= reorder ? 'low' : 'ok'
		};
	});

	return {
		allData,
		suppliers,
		form: await superValidate(zod4(addMaterial)),
		editForm: await superValidate(zod4(editMaterial))
	};
};

const values = (data: any, userId: string | undefined, creating: boolean) => ({
	name: data.name,
	supplierId: data.supplierId ?? null,
	unit: data.unit,
	// decimal columns round-trip as strings in drizzle/mysql2
	quantityOnHand: String(data.quantityOnHand),
	reorderLevel: data.reorderLevel == null ? null : String(data.reorderLevel),
	isActive: data.isActive,
	...(creating ? { createdBy: userId } : { updatedBy: userId })
});

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addMaterial));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db.insert(rawMaterials).values(values(form.data, locals?.user?.id, true));
			return message(form, { type: 'success', text: `${form.data.name} added` });
		} catch (err) {
			console.error('raw material add failed', err);
			return message(form, { type: 'error', text: 'Could not add this material.' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editMaterial));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db
				.update(rawMaterials)
				.set(values(form.data, locals?.user?.id, false))
				.where(eq(rawMaterials.id, form.data.id));
			return message(form, { type: 'success', text: `${form.data.name} updated` });
		} catch (err) {
			console.error('raw material edit failed', err);
			return message(form, { type: 'error', text: 'Could not save this material.' }, { status: 500 });
		}
	}
};
