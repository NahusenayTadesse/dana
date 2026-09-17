export type PoStatus = 'draft' | 'ordered' | 'in_transit' | 'received' | 'cancelled';

export type OrderRow = {
	id: number;
	supplierId: number;
	supplierName: string | null;
	status: PoStatus;
	expectedDate: string;
	receivedDate: string;
	raisedBy: number | null;
	raisedByName: string | null;
	notes: string | null;
	lineCount: number;
	value: number;
};

export type LineRow = {
	id: number;
	purchaseOrderId: number;
	rawMaterialId: number | null;
	variantId: number | null;
	itemName: string;
	quantity: number;
	unitCost: number | null;
	lineTotal: number | null;
};

export const STATUS_ITEMS = [
	{ value: 'draft', name: 'Draft' },
	{ value: 'ordered', name: 'Ordered' },
	{ value: 'in_transit', name: 'In transit' },
	{ value: 'received', name: 'Received' },
	{ value: 'cancelled', name: 'Cancelled' }
];

const STATUS_STEP: Record<Exclude<PoStatus, 'cancelled'>, number> = {
	draft: 0,
	ordered: 1,
	in_transit: 2,
	received: 3
};

/**
 * Purchase orders only move forward (draft → ordered → in transit → received)
 * or get cancelled before they are received. Received and cancelled are final:
 * received stock has already been added, so moving back would leave it counted
 * with nothing to show for it.
 */
export function canMoveStatus(from: PoStatus, to: PoStatus): boolean {
	if (from === to) return true;
	if (from === 'received' || from === 'cancelled') return false;
	if (to === 'cancelled') return true;
	return STATUS_STEP[to] > STATUS_STEP[from];
}

/** The statuses a PO currently at `from` may be saved with. */
export const statusItemsFrom = (from: PoStatus) =>
	STATUS_ITEMS.filter((item) => canMoveStatus(from, item.value as PoStatus));

/** A new PO has no lines yet, so it can't start out received (or cancelled). */
export const CREATE_STATUSES = ['draft', 'ordered', 'in_transit'] as const;
export const CREATE_STATUS_ITEMS = STATUS_ITEMS.filter((item) =>
	(CREATE_STATUSES as readonly string[]).includes(item.value)
);

/** Received or cancelled: lines can no longer be added, changed or removed. */
export const isLocked = (status: PoStatus) => status === 'received' || status === 'cancelled';

/** Maps the enum onto the badge vocabulary Table/statuses.svelte already knows. */
export const STATUS_BADGE: Record<PoStatus, string> = {
	draft: 'new',
	ordered: 'pending',
	in_transit: 'pending',
	received: 'complete',
	cancelled: 'cancelled'
};
