import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc, asc, sql, count } from 'drizzle-orm';

import { addOrder, editOrder } from './schema';
import { db } from '$lib/server/db';
import { purchaseOrders, purchaseOrderItems, productSuppliers, staff } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import type { OrderRow } from './types';
import { toDateInput, toDateValue } from '$lib/dateFields';
import { StockError } from '$lib/server/stock';
import { describeDbError } from '$lib/server/dbErrors';
import { PoRuleError, saveOrderHead } from './po.server';

export const load: PageServerLoad = async () => {
	const [rows, suppliers, people] = await Promise.all([
		db
			.select({
				id: purchaseOrders.id,
				supplierId: purchaseOrders.supplierId,
				supplierName: productSuppliers.name,
				status: purchaseOrders.status,
				expectedDate: purchaseOrders.expectedDate,
				receivedDate: purchaseOrders.receivedDate,
				raisedBy: purchaseOrders.raisedBy,
				raisedByName: staff.name,
				notes: purchaseOrders.notes,
				lineCount: count(purchaseOrderItems.id),
				// Lines without a unit cost contribute nothing rather than breaking
				// the sum — a draft is often raised before prices are agreed.
				// Each line rounded to the cent before summing, exactly as the detail
				// page totals it, so the two screens show the same figure.
				value: sql<string>`coalesce(sum(round(${purchaseOrderItems.quantity} * coalesce(${purchaseOrderItems.unitCost}, 0), 2)), 0)`
			})
			.from(purchaseOrders)
			.leftJoin(productSuppliers, eq(productSuppliers.id, purchaseOrders.supplierId))
			.leftJoin(staff, eq(staff.id, purchaseOrders.raisedBy))
			.leftJoin(purchaseOrderItems, eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id))
			.groupBy(purchaseOrders.id)
			.orderBy(desc(purchaseOrders.id)),
		db
			.select({ value: productSuppliers.id, name: productSuppliers.name })
			.from(productSuppliers)
			.orderBy(asc(productSuppliers.name)),
		db
			.select({ value: staff.id, name: staff.name })
			.from(staff)
			.where(eq(staff.isActive, true))
			.orderBy(asc(staff.name))
	]);

	const allData: OrderRow[] = rows.map((row) => ({
		...row,
		status: (row.status ?? 'draft') as OrderRow['status'],
		expectedDate: toDateInput(row.expectedDate),
		receivedDate: toDateInput(row.receivedDate),
		value: Number(row.value)
	}));

	return {
		allData,
		suppliers,
		people,
		form: await superValidate(zod4(addOrder)),
		editForm: await superValidate(zod4(editOrder))
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addOrder));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			await db.insert(purchaseOrders).values({
				supplierId: form.data.supplierId,
				status: form.data.status,
				expectedDate: toDateValue(form.data.expectedDate),
				receivedDate: toDateValue(form.data.receivedDate),
				raisedBy: form.data.raisedBy ?? null,
				notes: form.data.notes || null,
				createdBy: locals?.user?.id
			});
			return message(form, {
				type: 'success',
				text: 'Purchase order created — open it to add lines'
			});
		} catch (err) {
			console.error('purchase order add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not create this order.') },
				{ status: 500 }
			);
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editOrder));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			const found = await db.transaction((tx) => saveOrderHead(tx, form.data, locals?.user?.id));
			if (!found) {
				return message(
					form,
					{ type: 'error', text: 'This purchase order no longer exists. Reload the page.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: `PO-${form.data.id} updated` });
		} catch (err) {
			if (err instanceof PoRuleError || err instanceof StockError) {
				if (err instanceof PoRuleError && err.field === 'status')
					setError(form, 'status', err.message);
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('purchase order edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save this order.') },
				{ status: 500 }
			);
		}
	}
};
