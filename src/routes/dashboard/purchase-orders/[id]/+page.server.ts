import { error } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, asc } from 'drizzle-orm';

import { addLine, editLine, editOrder, removeLine } from '../schema';
import { toDateInput, toDateValue } from '$lib/dateFields';
import { db } from '$lib/server/db';
import {
	purchaseOrders,
	purchaseOrderItems,
	productSuppliers,
	rawMaterials,
	staff
} from '$lib/server/db/schema';
import { variantOptions } from '$lib/server/variantOptions';
import type { Actions, PageServerLoad } from './$types';
import type { LineRow, OrderRow } from '../types';

export const load: PageServerLoad = async ({ params }) => {
	const orderId = Number(params.id);
	if (!Number.isInteger(orderId)) error(404, 'Not found.');

	const [head] = await db
		.select({
			id: purchaseOrders.id,
			supplierId: purchaseOrders.supplierId,
			supplierName: productSuppliers.name,
			status: purchaseOrders.status,
			expectedDate: purchaseOrders.expectedDate,
			receivedDate: purchaseOrders.receivedDate,
			raisedBy: purchaseOrders.raisedBy,
			raisedByName: staff.name,
			notes: purchaseOrders.notes
		})
		.from(purchaseOrders)
		.leftJoin(productSuppliers, eq(productSuppliers.id, purchaseOrders.supplierId))
		.leftJoin(staff, eq(staff.id, purchaseOrders.raisedBy))
		.where(eq(purchaseOrders.id, orderId))
		.limit(1);

	if (!head) error(404, 'That purchase order does not exist.');

	const [lines, variants, materials, suppliers, people] = await Promise.all([
		db
			.select({
				id: purchaseOrderItems.id,
				purchaseOrderId: purchaseOrderItems.purchaseOrderId,
				rawMaterialId: purchaseOrderItems.rawMaterialId,
				rawMaterialName: rawMaterials.name,
				variantId: purchaseOrderItems.variantId,
				quantity: purchaseOrderItems.quantity,
				unitCost: purchaseOrderItems.unitCost
			})
			.from(purchaseOrderItems)
			.leftJoin(rawMaterials, eq(rawMaterials.id, purchaseOrderItems.rawMaterialId))
			.where(eq(purchaseOrderItems.purchaseOrderId, orderId))
			.orderBy(asc(purchaseOrderItems.id)),
		variantOptions(),
		db
			.select({ value: rawMaterials.id, name: rawMaterials.name })
			.from(rawMaterials)
			.where(eq(rawMaterials.isActive, true))
			.orderBy(asc(rawMaterials.name)),
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

	const variantLabels = new Map(variants.map((v) => [v.value, v.name]));

	const allData: LineRow[] = lines.map((line) => {
		const quantity = Number(line.quantity);
		const unitCost = line.unitCost == null ? null : Number(line.unitCost);
		return {
			id: line.id,
			purchaseOrderId: line.purchaseOrderId,
			rawMaterialId: line.rawMaterialId,
			variantId: line.variantId,
			itemName:
				line.rawMaterialName ??
				(line.variantId == null ? '—' : (variantLabels.get(line.variantId) ?? `Variant #${line.variantId}`)),
			quantity,
			unitCost,
			lineTotal: unitCost == null ? null : Math.round(quantity * unitCost * 100) / 100
		};
	});

	const order: OrderRow = {
		...head,
		status: (head.status ?? 'draft') as OrderRow['status'],
		expectedDate: toDateInput(head.expectedDate),
		receivedDate: toDateInput(head.receivedDate),
		lineCount: allData.length,
		value: allData.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0)
	};

	return {
		order,
		allData,
		variants,
		materials,
		suppliers,
		people,
		orderForm: await superValidate(zod4(editOrder)),
		form: await superValidate(zod4(addLine)),
		editForm: await superValidate(zod4(editLine)),
		deleteForm: await superValidate(zod4(removeLine))
	};
};

const lineValues = (data: any) => ({
	purchaseOrderId: data.purchaseOrderId,
	rawMaterialId: data.rawMaterialId ?? null,
	variantId: data.variantId ?? null,
	quantity: String(data.quantity),
	unitCost: data.unitCost == null ? null : String(data.unitCost)
});

export const actions: Actions = {
	addLine: async ({ request }) => {
		const form = await superValidate(request, zod4(addLine));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db.insert(purchaseOrderItems).values(lineValues(form.data));
			return message(form, { type: 'success', text: 'Line added' });
		} catch (err) {
			console.error('po line add failed', err);
			return message(form, { type: 'error', text: 'Could not add this line.' }, { status: 500 });
		}
	},

	editLine: async ({ request }) => {
		const form = await superValidate(request, zod4(editLine));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db
				.update(purchaseOrderItems)
				.set(lineValues(form.data))
				.where(eq(purchaseOrderItems.id, form.data.id));
			return message(form, { type: 'success', text: 'Line updated' });
		} catch (err) {
			console.error('po line edit failed', err);
			return message(form, { type: 'error', text: 'Could not save this line.' }, { status: 500 });
		}
	},

	removeLine: async ({ request }) => {
		const form = await superValidate(request, zod4(removeLine));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Nothing to remove' }, { status: 400 });
		}
		try {
			await db.delete(purchaseOrderItems).where(eq(purchaseOrderItems.id, form.data.id));
			return message(form, { type: 'success', text: 'Line removed' });
		} catch (err) {
			console.error('po line delete failed', err);
			return message(form, { type: 'error', text: 'Could not remove this line.' }, { status: 500 });
		}
	},

	editOrder: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editOrder));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		try {
			await db
				.update(purchaseOrders)
				.set({
					supplierId: form.data.supplierId,
					status: form.data.status,
					expectedDate: toDateValue(form.data.expectedDate),
					receivedDate: toDateValue(form.data.receivedDate),
					raisedBy: form.data.raisedBy ?? null,
					notes: form.data.notes || null,
					updatedBy: locals?.user?.id
				})
				.where(eq(purchaseOrders.id, form.data.id));
			return message(form, { type: 'success', text: 'Order updated' });
		} catch (err) {
			console.error('po edit failed', err);
			return message(form, { type: 'error', text: 'Could not save this order.' }, { status: 500 });
		}
	}
};
