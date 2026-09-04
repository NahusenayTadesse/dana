export type BatchRow = {
	id: number;
	batchNumber: string;
	variantId: number;
	variantName: string;
	rawMaterialId: number | null;
	rawMaterialName: string | null;
	rawMaterialConsumed: number | null;
	quantityProduced: number;
	scrapQuantity: number | null;
	producedBy: number | null;
	producedByName: string | null;
	warehouseId: number | null;
	warehouseName: string | null;
	/** `YYYY-MM-DD`, what the date input binds to. */
	productionDate: string;
	/** Scrap as a share of raw material consumed, or null when either is unknown. */
	scrapPercent: number | null;
};
