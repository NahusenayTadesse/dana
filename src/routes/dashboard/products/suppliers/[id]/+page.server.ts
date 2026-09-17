import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, count } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { setFlash } from 'sveltekit-flash-message/server';

import { edit } from './schema';
import { db } from '$lib/server/db';
import {
	products,
	purchaseOrders,
	rawMaterials,
	productAdjustments,
	productSuppliers as supplySuppliers
} from '$lib/server/db/schema';
import { parseIdParam } from '$lib/server/params';
import { describeDbError, isRowReferenced } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

/** How many rows in each table still point at this supplier. */
async function supplierUsage(id: number) {
	const [[p], [po], [rm], [adj]] = await Promise.all([
		db.select({ n: count() }).from(products).where(eq(products.supplierId, id)),
		db.select({ n: count() }).from(purchaseOrders).where(eq(purchaseOrders.supplierId, id)),
		db.select({ n: count() }).from(rawMaterials).where(eq(rawMaterials.supplierId, id)),
		db
			.select({ n: count() })
			.from(productAdjustments)
			.where(eq(productAdjustments.supplierId, id))
	]);
	return {
		products: p?.n ?? 0,
		purchaseOrders: po?.n ?? 0,
		rawMaterials: rm?.n ?? 0,
		adjustments: adj?.n ?? 0,
		total: (p?.n ?? 0) + (po?.n ?? 0) + (rm?.n ?? 0) + (adj?.n ?? 0)
	};
}

export const load: PageServerLoad = async ({ params }) => {
	const id = parseIdParam(params.id);

	const single = await db
		.select({
			id: supplySuppliers.id,
			name: supplySuppliers.name,
			phone: supplySuppliers.phone,
			email: supplySuppliers.email,
			description: supplySuppliers.description,
			status: supplySuppliers.isActive
		})
		.from(supplySuppliers)
		.where(eq(supplySuppliers.id, id))
		.limit(1)
		.then((rows) => rows[0]);

	if (!single) error(404, 'Supplier not found');

	const usage = await supplierUsage(id);

	const editForm = await superValidate(
		{
			name: single.name,
			phone: single.phone,
			email: single.email ?? '',
			description: single.description ?? '',
			status: single.status
		},
		zod4(edit),
		{ errors: false }
	);

	return {
		editForm,
		single,
		usage
	};
};

export const actions: Actions = {
	edit: async ({ request, params, locals }) => {
		const id = parseIdParam(params.id);
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { name, email, phone, description, status } = form.data;

		try {
			const [result] = await db
				.update(supplySuppliers)
				.set({
					name,
					phone,
					// Cleared optional fields arrive as undefined/'' — store NULL so
					// the old value is actually removed.
					email: email || null,
					description: description || null,
					isActive: status,
					updatedBy: locals?.user?.id
				})
				.where(eq(supplySuppliers.id, id));

			if (!result.affectedRows) {
				return message(
					form,
					{ type: 'error', text: 'That supplier no longer exists.' },
					{ status: 404 }
				);
			}

			return message(form, { type: 'success', text: 'Supplier Successfully Updated' });
		} catch (err) {
			console.error('supplier edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not update the supplier.') },
				{ status: 500 }
			);
		}
	},

	/**
	 * A supplier that products, purchase orders, raw materials or stock
	 * adjustments still point at is deactivated rather than deleted, so that
	 * history stays intact. Unreferenced suppliers are removed.
	 */
	delete: async ({ params, cookies, locals }) => {
		const id = parseIdParam(params.id);

		const deactivate = async () => {
			await db
				.update(supplySuppliers)
				.set({ isActive: false, updatedBy: locals?.user?.id })
				.where(eq(supplySuppliers.id, id));
		};

		try {
			const [existing] = await db
				.select({ id: supplySuppliers.id })
				.from(supplySuppliers)
				.where(eq(supplySuppliers.id, id))
				.limit(1);

			if (!existing) {
				setFlash({ type: 'error', message: 'That supplier no longer exists.' }, cookies);
				return fail(404);
			}

			const usage = await supplierUsage(id);

			if (usage.total > 0) {
				await deactivate();
				setFlash(
					{
						type: 'success',
						message:
							'This supplier is still linked to products, purchase orders, raw materials or stock records, so it was deactivated instead of deleted.'
					},
					cookies
				);
				return { deactivated: true };
			}

			try {
				await db.delete(supplySuppliers).where(eq(supplySuppliers.id, id));
			} catch (err) {
				// Something started referencing it between the check and the delete.
				if (!isRowReferenced(err)) throw err;
				await deactivate();
				setFlash(
					{
						type: 'success',
						message: 'This supplier is in use, so it was deactivated instead of deleted.'
					},
					cookies
				);
				return { deactivated: true };
			}

			setFlash({ type: 'success', message: 'Supplier Deleted Successfully!' }, cookies);
			return { deactivated: false };
		} catch (err) {
			console.error('supplier delete failed', err);
			setFlash(
				{ type: 'error', message: describeDbError(err, 'Could not delete the supplier.') },
				cookies
			);
			return fail(500);
		}
	}
};
