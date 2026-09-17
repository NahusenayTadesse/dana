import { superValidate, message, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { error } from '@sveltejs/kit';
import { and, eq, asc, sql } from 'drizzle-orm';

import { addLine, editLine, editOrder, removeLine } from '../schema';
import { toDateInput } from '$lib/dateFields';
import { db } from '$lib/server/db';
import {
	purchaseOrders,
	purchaseOrderItems,
	productSuppliers,
	rawMaterials,
	staff
} from '$lib/server/db/schema';
import { variantOptions } from '$lib/server/variantOptions';
import { parseIdParam } from '$lib/server/params';
import { StockError } from '$lib/server/stock';
import { describeDbError } from '$lib/server/dbErrors';
import { PoRuleError, assertLinesEditable, saveOrderHead } from '../po.server';
import type { LineRow, OrderRow } from '../types';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const orderId = parseIdParam(params.id);

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
			notes: purchaseOrders.notes,
			stockReceivedAt: purchaseOrders.stockReceivedAt
		})
		.from(purchaseOrders)
		.leftJoin(productSuppliers, eq(productSuppliers.id, purchaseOrders.supplierId))
		.leftJoin(staff, eq(staff.id, purchaseOrders.raisedBy))
		.where(eq(purchaseOrders.id, orderId))
		.limit(1);

	if (!head) error(404, 'That purchase order does not exist.');

	const [lines, allVariants, materials, suppliers, people] = await Promise.all([
		db
			.select({
				id: purchaseOrderItems.id,
				purchaseOrderId: purchaseOrderItems.purchaseOrderId,
				rawMaterialId: purchaseOrderItems.rawMaterialId,
				rawMaterialName: rawMaterials.name,
				variantId: purchaseOrderItems.variantId,
				quantity: purchaseOrderItems.quantity,
				unitCost: purchaseOrderItems.unitCost,
				// Rounded in SQL, the same way the list page sums it.
				lineTotal: sql<
					string | null
				>`round(${purchaseOrderItems.quantity} * ${purchaseOrderItems.unitCost}, 2)`
			})
			.from(purchaseOrderItems)
			.leftJoin(rawMaterials, eq(rawMaterials.id, purchaseOrderItems.rawMaterialId))
			.where(eq(purchaseOrderItems.purchaseOrderId, orderId))
			.orderBy(asc(purchaseOrderItems.id)),
		// Archived variants still label existing lines but aren't offered in pickers.
		variantOptions({ includeInactive: true }),
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

	const variantLabels = new Map(allVariants.map((v) => [v.value, v.name]));
	const variants = allVariants.filter((v) => !v.archived);

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
				(line.variantId == null
					? '—'
					: (variantLabels.get(line.variantId) ?? `Variant #${line.variantId}`)),
			quantity,
			unitCost,
			lineTotal: line.lineTotal == null ? null : Number(line.lineTotal)
		};
	});

	const { stockReceivedAt, ...headFields } = head;
	const order: OrderRow = {
		...headFields,
		// Stock already received counts as received whatever the label says.
		status: (stockReceivedAt != null ? 'received' : (head.status ?? 'draft')) as OrderRow['status'],
		expectedDate: toDateInput(head.expectedDate),
		receivedDate: toDateInput(head.receivedDate),
		lineCount: allData.length,
		value: Math.round(allData.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0) * 100) / 100
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

const lineValues = (data: {
	rawMaterialId?: number | null;
	variantId?: number | null;
	quantity: number;
	unitCost?: number | null;
}) => ({
	rawMaterialId: data.rawMaterialId ?? null,
	variantId: data.variantId ?? null,
	quantity: String(data.quantity),
	unitCost: data.unitCost == null ? null : String(data.unitCost)
});

/** Shared catch for the line actions. */
function lineFailure(form: any, err: unknown, what: string) {
	if (err instanceof PoRuleError) {
		return message(form, { type: 'error', text: err.message }, { status: 400 });
	}
	console.error(`po line ${what} failed`, err);
	return message(
		form,
		{ type: 'error', text: describeDbError(err, `Could not ${what} this line.`) },
		{ status: 500 }
	);
}

// Every line action takes the PO from the URL and scopes its write to it, and
// locks the PO row first so a line can't change while the order is being
// received (received and cancelled orders refuse line changes outright).
export const actions: Actions = {
	addLine: async ({ request, params }) => {
		const orderId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(addLine));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			await db.transaction(async (tx) => {
				await assertLinesEditable(tx, orderId);
				await tx
					.insert(purchaseOrderItems)
					.values({ purchaseOrderId: orderId, ...lineValues(form.data) });
			});
			return message(form, { type: 'success', text: 'Line added' });
		} catch (err) {
			return lineFailure(form, err, 'add');
		}
	},

	editLine: async ({ request, params }) => {
		const orderId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(editLine));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		try {
			const [result] = await db.transaction(async (tx) => {
				await assertLinesEditable(tx, orderId);
				return tx
					.update(purchaseOrderItems)
					.set(lineValues(form.data))
					.where(
						and(
							eq(purchaseOrderItems.id, form.data.id),
							eq(purchaseOrderItems.purchaseOrderId, orderId)
						)
					);
			});
			if (result.affectedRows === 0) {
				return message(
					form,
					{ type: 'error', text: 'This line is not on this order any more. Reload the page.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: 'Line updated' });
		} catch (err) {
			return lineFailure(form, err, 'save');
		}
	},

	removeLine: async ({ request, params }) => {
		const orderId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(removeLine));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Nothing to remove' }, { status: 400 });
		}
		try {
			const [result] = await db.transaction(async (tx) => {
				await assertLinesEditable(tx, orderId);
				return tx
					.delete(purchaseOrderItems)
					.where(
						and(
							eq(purchaseOrderItems.id, form.data.id),
							eq(purchaseOrderItems.purchaseOrderId, orderId)
						)
					);
			});
			if (result.affectedRows === 0) {
				return message(
					form,
					{ type: 'error', text: 'That line was already removed.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: 'Line removed' });
		} catch (err) {
			return lineFailure(form, err, 'remove');
		}
	},

	editOrder: async ({ request, params, locals }) => {
		const orderId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(editOrder));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		// The order being edited is the one in the URL.
		form.data.id = orderId;
		try {
			const found = await db.transaction((tx) => saveOrderHead(tx, form.data, locals?.user?.id));
			if (!found) {
				return message(
					form,
					{ type: 'error', text: 'This purchase order no longer exists.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: 'Order updated' });
		} catch (err) {
			if (err instanceof PoRuleError || err instanceof StockError) {
				if (err instanceof PoRuleError && err.field === 'status')
					setError(form, 'status', err.message);
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('po edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save this order.') },
				{ status: 500 }
			);
		}
	}
};
