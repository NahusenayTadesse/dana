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

/** Maps the enum onto the badge vocabulary Table/statuses.svelte already knows. */
export const STATUS_BADGE: Record<PoStatus, string> = {
	draft: 'new',
	ordered: 'pending',
	in_transit: 'pending',
	received: 'complete',
	cancelled: 'cancelled'
};
