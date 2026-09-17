import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, asc, and } from 'drizzle-orm';

import { addStock, editStock, removeStock } from './schema';
import { db } from '$lib/server/db';
import { stockLevels, warehouses } from '$lib/server/db/schema';
import { variantOptions } from '$lib/server/variantOptions';
import { setStock, syncVariantTotals, StockError } from '$lib/server/stock';
import { describeDbError, isDuplicateEntry } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';
import type { StockRow } from './types';

export const load: PageServerLoad = async () => {
	const [rows, allVariants, warehouseRows] = await Promise.all([
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
		// Archived variants still label existing rows but aren't offered in pickers.
		variantOptions({ includeInactive: true }),
		db
			.select({ value: warehouses.id, name: warehouses.name })
			.from(warehouses)
			.where(eq(warehouses.isActive, true))
			.orderBy(asc(warehouses.name))
	]);

	const labels = new Map(allVariants.map((v) => [v.value, v.name]));
	const variants = allVariants.filter((v) => !v.archived);

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

/** The pairing picked on edit already has its own row. */
class PairingTaken extends Error {}

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await superValidate(request, zod4(addStock));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		try {
			// One row per product-in-warehouse (unique index). Recording a pairing
			// that already exists replaces its count rather than adding a rival
			// row; setStock upserts and re-syncs the product totals.
			const existed = await db.transaction(async (tx) => {
				const [existing] = await tx
					.select({ id: stockLevels.id })
					.from(stockLevels)
					.where(
						and(
							eq(stockLevels.variantId, form.data.variantId),
							eq(stockLevels.warehouseId, form.data.warehouseId)
						)
					)
					.limit(1);
				await setStock(tx, form.data);
				return Boolean(existing);
			});

			return message(form, {
				type: 'success',
				text: existed
					? 'That product already had a count here — updated it instead.'
					: 'Stock recorded'
			});
		} catch (err) {
			if (err instanceof StockError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('stock add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not record this stock.') },
				{ status: 500 }
			);
		}
	},

	edit: async ({ request }) => {
		const form = await superValidate(request, zod4(editStock));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		const { id, variantId, warehouseId, quantity } = form.data;

		try {
			const found = await db.transaction(async (tx) => {
				const [current] = await tx
					.select({ variantId: stockLevels.variantId, warehouseId: stockLevels.warehouseId })
					.from(stockLevels)
					.where(eq(stockLevels.id, id))
					.for('update')
					.limit(1);
				if (!current) return false;

				if (current.variantId === variantId && current.warehouseId === warehouseId) {
					await setStock(tx, { variantId, warehouseId, quantity });
					return true;
				}

				// Moving the count to another product/warehouse: refuse when that
				// pairing already has a row, otherwise the unique index would.
				const [clash] = await tx
					.select({ id: stockLevels.id })
					.from(stockLevels)
					.where(
						and(eq(stockLevels.variantId, variantId), eq(stockLevels.warehouseId, warehouseId))
					)
					.limit(1);
				if (clash) throw new PairingTaken();

				await tx
					.update(stockLevels)
					.set({ variantId, warehouseId, quantity })
					.where(eq(stockLevels.id, id));
				await syncVariantTotals(tx, [current.variantId, variantId]);
				return true;
			});

			if (!found) {
				return message(
					form,
					{ type: 'error', text: 'This stock line no longer exists. Reload the page.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: 'Stock updated' });
		} catch (err) {
			if (err instanceof PairingTaken || isDuplicateEntry(err)) {
				setError(
					form,
					'warehouseId',
					'That product already has a count in this warehouse — edit that line instead.'
				);
				return message(
					form,
					{ type: 'error', text: 'That pairing already exists.' },
					{ status: 400 }
				);
			}
			if (err instanceof StockError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('stock edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save this count.') },
				{ status: 500 }
			);
		}
	},

	remove: async ({ request }) => {
		const form = await superValidate(request, zod4(removeStock));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Nothing to remove' }, { status: 400 });
		}
		try {
			const removed = await db.transaction(async (tx) => {
				const [row] = await tx
					.select({ variantId: stockLevels.variantId })
					.from(stockLevels)
					.where(eq(stockLevels.id, form.data.id))
					.for('update')
					.limit(1);
				if (!row) return false;
				await tx.delete(stockLevels).where(eq(stockLevels.id, form.data.id));
				// The variant/product totals are sums of these rows.
				await syncVariantTotals(tx, [row.variantId]);
				return true;
			});
			if (!removed) {
				return message(
					form,
					{ type: 'error', text: 'That line was already removed.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: 'Stock line removed' });
		} catch (err) {
			console.error('stock delete failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not remove this line.') },
				{ status: 500 }
			);
		}
	}
};
