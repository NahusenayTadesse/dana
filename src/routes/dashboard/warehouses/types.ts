export type WarehouseRow = {
	id: number;
	name: string;
	location: string | null;
	isDefault: boolean;
	isActive: boolean;
	stockLines: number;
};
