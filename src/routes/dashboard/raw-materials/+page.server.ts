import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, asc } from 'drizzle-orm';

import { addMaterial, editMaterial } from './schema';
import { db } from '$lib/server/db';
import { rawMaterials, productSuppliers } from '$lib/server/db/schema';
import { adjustRawMaterial, StockError } from '$lib/server/stock';
import { describeDbError } from '$lib/server/dbErrors';
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
	reorderLevel: data.reorderLevel == null ? null : String(data.reorderLevel),
	isActive: data.isActive,
	...(creating
		? // decimal columns round-trip as strings in drizzle/mysql2
			{ quantityOnHand: String(data.quantityOnHand), createdBy: userId }
		: { updatedBy: userId })
});

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addMaterial));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			await db.insert(rawMaterials).values(values(form.data, locals?.user?.id, true));
			return message(form, { type: 'success', text: `${form.data.name} added` });
		} catch (err) {
			console.error('raw material add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add this material.') },
				{ status: 500 }
			);
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editMaterial));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			const found = await db.transaction(async (tx) => {
				const [result] = await tx
					.update(rawMaterials)
					.set(values(form.data, locals?.user?.id, false))
					.where(eq(rawMaterials.id, form.data.id));
				if (result.affectedRows === 0) return false;
				// Relative, atomic and refuses to go below zero, so movements made
				// since the sheet was opened are kept.
				if (form.data.adjustBy) {
					await adjustRawMaterial(tx, form.data.id, form.data.adjustBy);
				}
				return true;
			});
			if (!found) {
				return message(
					form,
					{ type: 'error', text: 'This material no longer exists. Reload the page.' },
					{ status: 404 }
				);
			}
			// Clear the adjustment so saving the sheet again doesn't apply it twice.
			form.data.adjustBy = null;
			return message(form, { type: 'success', text: `${form.data.name} updated` });
		} catch (err) {
			if (err instanceof StockError) {
				setError(form, 'adjustBy', err.message);
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('raw material edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save this material.') },
				{ status: 500 }
			);
		}
	}
};
