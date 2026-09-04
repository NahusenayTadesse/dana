import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, ne, asc, count } from 'drizzle-orm';

import { addWarehouse, editWarehouse } from './schema';
import { db } from '$lib/server/db';
import { warehouses, stockLevels } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: warehouses.id,
			name: warehouses.name,
			location: warehouses.location,
			isDefault: warehouses.isDefault,
			isActive: warehouses.isActive,
			stockLines: count(stockLevels.id)
		})
		.from(warehouses)
		.leftJoin(stockLevels, eq(stockLevels.warehouseId, warehouses.id))
		.groupBy(warehouses.id)
		.orderBy(asc(warehouses.name));

	return {
		allData: rows.map((row) => ({ ...row, isDefault: row.isDefault ?? false })),
		form: await superValidate(zod4(addWarehouse)),
		editForm: await superValidate(zod4(editWarehouse))
	};
};

/**
 * "Default" is a single flag across the table, so setting it on one row has to
 * clear it everywhere else — otherwise two warehouses both claim to be the
 * default and whichever the query happens to return first wins.
 */
async function clearOtherDefaults(keepId: number | null) {
	await db
		.update(warehouses)
		.set({ isDefault: false })
		.where(keepId == null ? ne(warehouses.id, 0) : ne(warehouses.id, keepId));
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addWarehouse));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		try {
			await db.transaction(async () => {
				if (form.data.isDefault) await clearOtherDefaults(null);
				await db.insert(warehouses).values({
					name: form.data.name,
					location: form.data.location || null,
					isDefault: form.data.isDefault,
					isActive: form.data.isActive,
					createdBy: locals?.user?.id
				});
			});
			return message(form, { type: 'success', text: `${form.data.name} added` });
		} catch (err) {
			console.error('warehouse add failed', err);
			return message(form, { type: 'error', text: 'Could not add this warehouse.' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editWarehouse));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		try {
			await db.transaction(async () => {
				if (form.data.isDefault) await clearOtherDefaults(form.data.id);
				await db
					.update(warehouses)
					.set({
						name: form.data.name,
						location: form.data.location || null,
						isDefault: form.data.isDefault,
						isActive: form.data.isActive,
						updatedBy: locals?.user?.id
					})
					.where(eq(warehouses.id, form.data.id));
			});
			return message(form, { type: 'success', text: `${form.data.name} updated` });
		} catch (err) {
			console.error('warehouse edit failed', err);
			return message(form, { type: 'error', text: 'Could not save this warehouse.' }, { status: 500 });
		}
	}
};
