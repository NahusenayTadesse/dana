import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc, asc, sql, count } from 'drizzle-orm';

import { addOrder, editOrder } from './schema';
import { db } from '$lib/server/db';
import {
	purchaseOrders,
	purchaseOrderItems,
	productSuppliers,
	staff
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import type { OrderRow } from './types';
import { toDateInput, toDateValue } from '$lib/dateFields';

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
				value: sql<string>`coalesce(sum(${purchaseOrderItems.quantity} * coalesce(${purchaseOrderItems.unitCost}, 0)), 0)`
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

const values = (data: any, userId: string | undefined, creating: boolean) => ({
	supplierId: data.supplierId,
	status: data.status,
	expectedDate: toDateValue(data.expectedDate),
	receivedDate: toDateValue(data.receivedDate),
	raisedBy: data.raisedBy ?? null,
	notes: data.notes || null,
	...(creating ? { createdBy: userId } : { updatedBy: userId })
});

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addOrder));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db.insert(purchaseOrders).values(values(form.data, locals?.user?.id, true));
			return message(form, { type: 'success', text: 'Purchase order created — open it to add lines' });
		} catch (err) {
			console.error('purchase order add failed', err);
			return message(form, { type: 'error', text: 'Could not create this order.' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editOrder));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db
				.update(purchaseOrders)
				.set(values(form.data, locals?.user?.id, false))
				.where(eq(purchaseOrders.id, form.data.id));
			return message(form, { type: 'success', text: `Order #${form.data.id} updated` });
		} catch (err) {
			console.error('purchase order edit failed', err);
			return message(form, { type: 'error', text: 'Could not save this order.' }, { status: 500 });
		}
	}
};
