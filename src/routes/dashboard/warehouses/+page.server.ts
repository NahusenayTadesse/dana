import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, ne, asc, count, and } from 'drizzle-orm';

import { addWarehouse, editWarehouse } from './schema';
import { db } from '$lib/server/db';
import { warehouses, stockLevels } from '$lib/server/db/schema';
import { describeDbError } from '$lib/server/dbErrors';
import type { DbLike } from '$lib/server/stock';
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
 * default and whichever the query happens to return first wins. Runs inside
 * the caller's transaction so a failed save never leaves no default at all.
 */
async function clearOtherDefaults(tx: DbLike, keepId: number | null) {
	await tx
		.update(warehouses)
		.set({ isDefault: false })
		.where(
			keepId == null
				? eq(warehouses.isDefault, true)
				: and(eq(warehouses.isDefault, true), ne(warehouses.id, keepId))
		);
}

/** A default-warehouse rule was broken; `field` is where to show it. */
class DefaultRule extends Error {
	constructor(
		public field: 'isDefault' | 'isActive',
		message: string
	) {
		super(message);
	}
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addWarehouse));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		try {
			const madeDefault = await db.transaction(async (tx) => {
				// Stock lands in the default warehouse, so once any warehouse exists
				// one of them must be it: the first one becomes default on its own.
				const [existingDefault] = await tx
					.select({ id: warehouses.id })
					.from(warehouses)
					.where(eq(warehouses.isDefault, true))
					.for('update')
					.limit(1);
				const isDefault = form.data.isDefault || !existingDefault;
				if (isDefault && !form.data.isActive) {
					throw new DefaultRule('isActive', 'The default warehouse has to be in use.');
				}

				if (isDefault) await clearOtherDefaults(tx, null);
				await tx.insert(warehouses).values({
					name: form.data.name,
					location: form.data.location || null,
					isDefault,
					isActive: form.data.isActive,
					createdBy: locals?.user?.id
				});
				return isDefault && !form.data.isDefault;
			});
			return message(form, {
				type: 'success',
				text: madeDefault
					? `${form.data.name} added as the default warehouse (there wasn't one yet)`
					: `${form.data.name} added`
			});
		} catch (err) {
			if (err instanceof DefaultRule) {
				setError(form, err.field, err.message);
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('warehouse add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add this warehouse.') },
				{ status: 500 }
			);
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editWarehouse));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		try {
			const found = await db.transaction(async (tx) => {
				const [current] = await tx
					.select({ isDefault: warehouses.isDefault })
					.from(warehouses)
					.where(eq(warehouses.id, form.data.id))
					.for('update')
					.limit(1);
				if (!current) return false;

				// There is always exactly one default: it moves by marking another
				// warehouse default (which clears this one), never by unticking it.
				if (current.isDefault && !form.data.isDefault) {
					throw new DefaultRule(
						'isDefault',
						'This is the default warehouse. Mark another warehouse as default instead.'
					);
				}
				if (form.data.isDefault && !form.data.isActive) {
					throw new DefaultRule(
						'isActive',
						'The default warehouse has to be in use. Make another one default first.'
					);
				}

				if (form.data.isDefault) await clearOtherDefaults(tx, form.data.id);
				await tx
					.update(warehouses)
					.set({
						name: form.data.name,
						location: form.data.location || null,
						isDefault: form.data.isDefault,
						isActive: form.data.isActive,
						updatedBy: locals?.user?.id
					})
					.where(eq(warehouses.id, form.data.id));
				return true;
			});

			if (!found) {
				return message(
					form,
					{ type: 'error', text: 'This warehouse no longer exists. Reload the page.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: `${form.data.name} updated` });
		} catch (err) {
			if (err instanceof DefaultRule) {
				setError(form, err.field, err.message);
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('warehouse edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save this warehouse.') },
				{ status: 500 }
			);
		}
	}
};
