import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc, asc } from 'drizzle-orm';

import { addBatch, editBatch } from './schema';
import { db } from '$lib/server/db';
import { productionBatches, rawMaterials, staff, warehouses } from '$lib/server/db/schema';
import { variantOptions } from '$lib/server/variantOptions';
import type { Actions, PageServerLoad } from './$types';
import type { BatchRow } from './types';
import { toDateInput, requireDateValue } from '$lib/dateFields';

export const load: PageServerLoad = async () => {
	const [rows, variants, materials, people, warehouseRows] = await Promise.all([
		db
			.select({
				id: productionBatches.id,
				batchNumber: productionBatches.batchNumber,
				variantId: productionBatches.variantId,
				rawMaterialId: productionBatches.rawMaterialId,
				rawMaterialName: rawMaterials.name,
				rawMaterialConsumed: productionBatches.rawMaterialConsumed,
				quantityProduced: productionBatches.quantityProduced,
				scrapQuantity: productionBatches.scrapQuantity,
				producedBy: productionBatches.producedBy,
				producedByName: staff.name,
				warehouseId: productionBatches.warehouseId,
				warehouseName: warehouses.name,
				productionDate: productionBatches.productionDate
			})
			.from(productionBatches)
			.leftJoin(rawMaterials, eq(rawMaterials.id, productionBatches.rawMaterialId))
			.leftJoin(staff, eq(staff.id, productionBatches.producedBy))
			.leftJoin(warehouses, eq(warehouses.id, productionBatches.warehouseId))
			.orderBy(desc(productionBatches.productionDate), desc(productionBatches.id)),
		variantOptions(),
		db
			.select({ value: rawMaterials.id, name: rawMaterials.name })
			.from(rawMaterials)
			.where(eq(rawMaterials.isActive, true))
			.orderBy(asc(rawMaterials.name)),
		db
			.select({ value: staff.id, name: staff.name })
			.from(staff)
			.where(eq(staff.isActive, true))
			.orderBy(asc(staff.name)),
		db
			.select({ value: warehouses.id, name: warehouses.name })
			.from(warehouses)
			.where(eq(warehouses.isActive, true))
			.orderBy(asc(warehouses.name))
	]);

	const labels = new Map(variants.map((v) => [v.value, v.name]));

	const allData: BatchRow[] = rows.map((row) => {
		const consumed = row.rawMaterialConsumed == null ? null : Number(row.rawMaterialConsumed);
		const scrap = row.scrapQuantity == null ? null : Number(row.scrapQuantity);
		return {
			...row,
			variantName: labels.get(row.variantId) ?? `Variant #${row.variantId}`,
			rawMaterialConsumed: consumed,
			scrapQuantity: scrap,
			productionDate: toDateInput(row.productionDate),
			// Only meaningful against the material that was actually consumed —
			// scrap over pieces produced would compare two different units.
			scrapPercent:
				consumed && consumed > 0 && scrap != null ? Math.round((scrap / consumed) * 1000) / 10 : null
		};
	});

	return {
		allData,
		variants,
		materials,
		people,
		warehouses: warehouseRows,
		form: await superValidate(zod4(addBatch)),
		editForm: await superValidate(zod4(editBatch))
	};
};

const values = (data: any, userId: string | undefined, creating: boolean) => ({
	batchNumber: data.batchNumber,
	variantId: data.variantId,
	rawMaterialId: data.rawMaterialId ?? null,
	rawMaterialConsumed: data.rawMaterialConsumed == null ? null : String(data.rawMaterialConsumed),
	quantityProduced: data.quantityProduced,
	scrapQuantity: data.scrapQuantity == null ? null : String(data.scrapQuantity),
	producedBy: data.producedBy ?? null,
	warehouseId: data.warehouseId ?? null,
	productionDate: requireDateValue(data.productionDate),
	...(creating ? { createdBy: userId } : { updatedBy: userId })
});

/** Drizzle wraps the driver error, so `err.code` alone never sees ER_DUP_ENTRY. */
function isDuplicate(err: unknown): boolean {
	let current: any = err;
	for (let depth = 0; current && depth < 5; depth++) {
		if (current.code === 'ER_DUP_ENTRY' || current.errno === 1062) return true;
		current = current.cause;
	}
	return false;
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addBatch));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db.insert(productionBatches).values(values(form.data, locals?.user?.id, true));
			return message(form, { type: 'success', text: `Batch ${form.data.batchNumber} recorded` });
		} catch (err) {
			if (isDuplicate(err)) {
				setError(form, 'batchNumber', 'That batch number is already used.');
				return message(form, { type: 'error', text: 'That batch number is already used.' }, { status: 400 });
			}
			console.error('batch add failed', err);
			return message(form, { type: 'error', text: 'Could not record this batch.' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editBatch));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db
				.update(productionBatches)
				.set(values(form.data, locals?.user?.id, false))
				.where(eq(productionBatches.id, form.data.id));
			return message(form, { type: 'success', text: `Batch ${form.data.batchNumber} updated` });
		} catch (err) {
			if (isDuplicate(err)) {
				setError(form, 'batchNumber', 'That batch number is already used.');
				return message(form, { type: 'error', text: 'That batch number is already used.' }, { status: 400 });
			}
			console.error('batch edit failed', err);
			return message(form, { type: 'error', text: 'Could not save this batch.' }, { status: 500 });
		}
	}
};
