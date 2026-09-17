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
import {
	adjustRawMaterial,
	adjustStock,
	getDefaultWarehouseId,
	StockError
} from '$lib/server/stock';
import { describeDbError, isDuplicateEntry } from '$lib/server/dbErrors';

export const load: PageServerLoad = async () => {
	const [rows, allVariants, materials, people, warehouseRows] = await Promise.all([
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
		// Archived variants still label existing batches but aren't offered in pickers.
		variantOptions({ includeInactive: true }),
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

	const labels = new Map(allVariants.map((v) => [v.value, v.name]));
	const variants = allVariants.filter((v) => !v.archived);

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
				consumed && consumed > 0 && scrap != null
					? Math.round((scrap / consumed) * 1000) / 10
					: null
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

const values = (data: any, warehouseId: number, userId: string | undefined, creating: boolean) => ({
	batchNumber: data.batchNumber,
	variantId: data.variantId,
	rawMaterialId: data.rawMaterialId ?? null,
	rawMaterialConsumed: data.rawMaterialConsumed == null ? null : String(data.rawMaterialConsumed),
	quantityProduced: data.quantityProduced,
	scrapQuantity: data.scrapQuantity == null ? null : String(data.scrapQuantity),
	producedBy: data.producedBy ?? null,
	// Always the warehouse the output actually went into (the default one when
	// none was picked), so a later edit knows where to take it back from.
	warehouseId,
	productionDate: requireDateValue(data.productionDate),
	...(creating ? { createdBy: userId } : { updatedBy: userId })
});

/** Raw material taken by a batch: nothing unless both material and amount are set. */
const consumption = (materialId: number | null, consumed: number | string | null) => {
	const amount = consumed == null ? 0 : Number(consumed);
	return materialId != null && amount > 0 ? { materialId, amount } : null;
};

function batchError(form: any, err: unknown, action: 'record' | 'save') {
	if (isDuplicateEntry(err)) {
		setError(form, 'batchNumber', 'That batch number is already used.');
		return message(
			form,
			{ type: 'error', text: 'That batch number is already used.' },
			{ status: 400 }
		);
	}
	if (err instanceof StockError) {
		return message(form, { type: 'error', text: err.message }, { status: 400 });
	}
	console.error(`batch ${action} failed`, err);
	return message(
		form,
		{ type: 'error', text: describeDbError(err, `Could not ${action} this batch.`) },
		{ status: 500 }
	);
}

export const actions: Actions = {
	// A batch moves stock: its material consumption comes off the raw
	// material's on-hand and its pieces go into the warehouse, in the same
	// transaction as the batch row, so the three can't disagree.
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addBatch));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			await db.transaction(async (tx) => {
				const warehouseId = form.data.warehouseId ?? (await getDefaultWarehouseId(tx));
				await tx
					.insert(productionBatches)
					.values(values(form.data, warehouseId, locals?.user?.id, true));

				const used = consumption(form.data.rawMaterialId, form.data.rawMaterialConsumed);
				if (used) await adjustRawMaterial(tx, used.materialId, -used.amount);

				await adjustStock(tx, {
					variantId: form.data.variantId,
					warehouseId,
					delta: form.data.quantityProduced
				});
			});
			return message(form, { type: 'success', text: `Batch ${form.data.batchNumber} recorded` });
		} catch (err) {
			return batchError(form, err, 'record');
		}
	},

	// Editing applies only the difference: the old batch's consumption and
	// output are reversed and the new ones applied. Reversing output that has
	// since been sold or moved is refused rather than driving stock negative.
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editBatch));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			const found = await db.transaction(async (tx) => {
				const [old] = await tx
					.select({
						variantId: productionBatches.variantId,
						rawMaterialId: productionBatches.rawMaterialId,
						rawMaterialConsumed: productionBatches.rawMaterialConsumed,
						quantityProduced: productionBatches.quantityProduced,
						warehouseId: productionBatches.warehouseId
					})
					.from(productionBatches)
					.where(eq(productionBatches.id, form.data.id))
					.for('update')
					.limit(1);
				if (!old) return false;

				const defaultId =
					old.warehouseId == null || form.data.warehouseId == null
						? await getDefaultWarehouseId(tx)
						: null;
				const oldWarehouseId = old.warehouseId ?? (defaultId as number);
				const newWarehouseId = form.data.warehouseId ?? (defaultId as number);

				await tx
					.update(productionBatches)
					.set(values(form.data, newWarehouseId, locals?.user?.id, false))
					.where(eq(productionBatches.id, form.data.id));

				// Raw material: give back what the old batch took, then take the new
				// amount — for the same material that nets to the difference.
				const oldUse = consumption(old.rawMaterialId, old.rawMaterialConsumed);
				const newUse = consumption(form.data.rawMaterialId, form.data.rawMaterialConsumed);
				if (oldUse && newUse && oldUse.materialId === newUse.materialId) {
					await adjustRawMaterial(tx, newUse.materialId, oldUse.amount - newUse.amount);
				} else {
					if (oldUse) await adjustRawMaterial(tx, oldUse.materialId, oldUse.amount);
					if (newUse) await adjustRawMaterial(tx, newUse.materialId, -newUse.amount);
				}

				// Output: same shelf → one delta; a different product or warehouse →
				// take the old pieces out of where they landed, put the new ones in.
				if (old.variantId === form.data.variantId && oldWarehouseId === newWarehouseId) {
					await adjustStock(tx, {
						variantId: form.data.variantId,
						warehouseId: newWarehouseId,
						delta: form.data.quantityProduced - old.quantityProduced
					});
				} else {
					await adjustStock(tx, {
						variantId: old.variantId,
						warehouseId: oldWarehouseId,
						delta: -old.quantityProduced
					});
					await adjustStock(tx, {
						variantId: form.data.variantId,
						warehouseId: newWarehouseId,
						delta: form.data.quantityProduced
					});
				}
				return true;
			});

			if (!found) {
				return message(
					form,
					{ type: 'error', text: 'This batch no longer exists. Reload the page.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: `Batch ${form.data.batchNumber} updated` });
		} catch (err) {
			return batchError(form, err, 'save');
		}
	}
};
