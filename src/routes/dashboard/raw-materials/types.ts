export type MaterialRow = {
	id: number;
	name: string;
	supplierId: number | null;
	supplierName: string | null;
	unit: 'kg' | 'ton' | 'm' | 'coil';
	quantityOnHand: number;
	reorderLevel: number | null;
	isActive: boolean;
	/** 'low' once on-hand has fallen to the reorder level, else 'ok'. */
	stockState: 'low' | 'ok' | 'none';
};
