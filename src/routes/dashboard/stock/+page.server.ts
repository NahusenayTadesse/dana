import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, asc, and } from 'drizzle-orm';

import { addStock, editStock, removeStock } from './schema';
import { db } from '$lib/server/db';
import { stockLevels, warehouses } from '$lib/server/db/schema';
import { variantOptions } from '$lib/server/variantOptions';
import type { Actions, PageServerLoad } from './$types';
import type { StockRow } from './types';

export const load: PageServerLoad = async () => {
	const [rows, variants, warehouseRows] = await Promise.all([
		db
			.select({
				id: stockLevels.id,
				variantId: stockLevels.variantId,
				warehouseId: stockLevels.warehouseId,
				warehouseName: warehouses.name,
				quantity: stockLevels.quantity
			})
			.from(stockLevels)
			.innerJoin(warehouses, eq(warehouses.id, stockLevels.warehouseId))
			.orderBy(asc(warehouses.name)),
		variantOptions(),
		db
			.select({ value: warehouses.id, name: warehouses.name })
			.from(warehouses)
			.where(eq(warehouses.isActive, true))
			.orderBy(asc(warehouses.name))
	]);

	const labels = new Map(variants.map((v) => [v.value, v.name]));

	const allData: StockRow[] = rows.map((row) => ({
		...row,
		variantName: labels.get(row.variantId) ?? `Variant #${row.variantId}`
	}));

	return {
		allData,
		variants,
		warehouses: warehouseRows,
		form: await superValidate(zod4(addStock)),
		editForm: await superValidate(zod4(editStock)),
		deleteForm: await superValidate(zod4(removeStock))
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await superValidate(request, zod4(addStock));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		try {
			// One row per product-in-warehouse. Adding a pairing that already
			// exists would leave two counts for the same shelf, so this adjusts
			// the existing row rather than creating a rival to it.
			const [existing] = await db
				.select({ id: stockLevels.id })
				.from(stockLevels)
				.where(
					and(
						eq(stockLevels.variantId, form.data.variantId),
						eq(stockLevels.warehouseId, form.data.warehouseId)
					)
				)
				.limit(1);

			if (existing) {
				await db
					.update(stockLevels)
					.set({ quantity: form.data.quantity })
					.where(eq(stockLevels.id, existing.id));
				return message(form, {
					type: 'success',
					text: 'That product already had a count here — updated it instead.'
				});
			}

			await db.insert(stockLevels).values(form.data);
			return message(form, { type: 'success', text: 'Stock recorded' });
		} catch (err) {
			console.error('stock add failed', err);
			return message(form, { type: 'error', text: 'Could not record this stock.' }, { status: 500 });
		}
	},

	edit: async ({ request }) => {
		const form = await superValidate(request, zod4(editStock));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		try {
			const [clash] = await db
				.select({ id: stockLevels.id })
				.from(stockLevels)
				.where(
					and(
						eq(stockLevels.variantId, form.data.variantId),
						eq(stockLevels.warehouseId, form.data.warehouseId)
					)
				)
				.limit(1);

			if (clash && clash.id !== form.data.id) {
				setError(form, 'warehouseId', 'That product already has a count in this warehouse.');
				return message(form, { type: 'error', text: 'That pairing already exists.' }, { status: 400 });
			}

			await db.update(stockLevels).set(form.data).where(eq(stockLevels.id, form.data.id));
			return message(form, { type: 'success', text: 'Stock updated' });
		} catch (err) {
			console.error('stock edit failed', err);
			return message(form, { type: 'error', text: 'Could not save this count.' }, { status: 500 });
		}
	},

	remove: async ({ request }) => {
		const form = await superValidate(request, zod4(removeStock));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Nothing to remove' }, { status: 400 });
		}
		try {
			await db.delete(stockLevels).where(eq(stockLevels.id, form.data.id));
			return message(form, { type: 'success', text: 'Stock line removed' });
		} catch (err) {
			console.error('stock delete failed', err);
			return message(form, { type: 'error', text: 'Could not remove this line.' }, { status: 500 });
		}
	}
};
