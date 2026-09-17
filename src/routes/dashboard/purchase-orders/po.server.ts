// Purchase-order rules shared by the list page's edit sheet and the PO detail
// page. Not a `+` file, so SvelteKit treats it as a plain server module.

import { eq, count } from 'drizzle-orm';
import { purchaseOrders, purchaseOrderItems } from '$lib/server/db/schema';
import { receivePurchaseOrderStock, type DbLike } from '$lib/server/stock';
import { toDateValue } from '$lib/dateFields';
import { canMoveStatus, isLocked, type PoStatus } from './types';
import type { EditOrder } from './schema';

/** A purchase-order rule was broken. `message` is safe to show to staff. */
export class PoRuleError extends Error {
	constructor(
		message: string,
		public field?: 'status' | 'quantity'
	) {
		super(message);
	}
}

/** Today's `YYYY-MM-DD` in Ethiopia, whatever timezone the server runs in. */
const businessToday = () =>
	new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Addis_Ababa' }).format(new Date());

const STATUS_LABEL: Record<PoStatus, string> = {
	draft: 'draft',
	ordered: 'ordered',
	in_transit: 'in transit',
	received: 'received',
	cancelled: 'cancelled'
};

/**
 * Lock the PO row for the rest of the transaction and return its status.
 * Received (or already stock-received) counts as received even if the label
 * somehow says otherwise. Returns null when the PO doesn't exist.
 */
export async function lockOrder(tx: DbLike, id: number): Promise<PoStatus | null> {
	const [row] = await tx
		.select({ status: purchaseOrders.status, stockReceivedAt: purchaseOrders.stockReceivedAt })
		.from(purchaseOrders)
		.where(eq(purchaseOrders.id, id))
		.for('update')
		.limit(1);
	if (!row) return null;
	if (row.stockReceivedAt != null) return 'received';
	return (row.status ?? 'draft') as PoStatus;
}

/** Refuse line changes on a received or cancelled PO. Throws PoRuleError. */
export async function assertLinesEditable(tx: DbLike, id: number): Promise<void> {
	const status = await lockOrder(tx, id);
	if (status == null) throw new PoRuleError('This purchase order no longer exists.');
	if (isLocked(status)) {
		throw new PoRuleError(
			status === 'received'
				? 'This order has been received and its stock added, so its lines can no longer change.'
				: 'This order is cancelled, so its lines can no longer change.'
		);
	}
}

/**
 * Save a PO's header. Status only moves forward (or to cancelled before
 * receipt); moving to received adds the lines to stock exactly once. Returns
 * false when the PO doesn't exist. Mutates `data.receivedDate` when it fills
 * in today's date on receipt, so the form shows it.
 */
export async function saveOrderHead(
	tx: DbLike,
	data: EditOrder,
	userId: string | undefined
): Promise<boolean> {
	const current = await lockOrder(tx, data.id);
	if (current == null) return false;

	if (!canMoveStatus(current, data.status)) {
		throw new PoRuleError(
			current === 'received' || current === 'cancelled'
				? `This order is ${STATUS_LABEL[current]}, so its status can no longer change.`
				: `An order can't go back from ${STATUS_LABEL[current]} to ${STATUS_LABEL[data.status]}.`,
			'status'
		);
	}

	const receiving = data.status === 'received' && current !== 'received';
	if (receiving) {
		const [{ lines }] = await tx
			.select({ lines: count() })
			.from(purchaseOrderItems)
			.where(eq(purchaseOrderItems.purchaseOrderId, data.id));
		if (lines === 0) {
			throw new PoRuleError('Add at least one line before marking this order received.', 'status');
		}
		if (!data.receivedDate) data.receivedDate = businessToday();
	}

	await tx
		.update(purchaseOrders)
		.set({
			supplierId: data.supplierId,
			status: data.status,
			expectedDate: toDateValue(data.expectedDate),
			receivedDate: toDateValue(data.receivedDate),
			raisedBy: data.raisedBy ?? null,
			notes: data.notes || null,
			updatedBy: userId
		})
		.where(eq(purchaseOrders.id, data.id));

	// Idempotent (claims stock_received_at), and in the same transaction as the
	// status change, so a failed receipt leaves the order un-received.
	if (receiving) await receivePurchaseOrderStock(tx, data.id);
	return true;
}
