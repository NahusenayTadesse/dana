import { z } from 'zod/v4';

/** `stock_levels.quantity` is a signed INT column. */
export const MAX_STOCK = 2_147_483_647;

const fields = {
	variantId: z.coerce.number('Pick a product').int().positive('Pick a product'),
	warehouseId: z.coerce.number('Pick a warehouse').int().positive('Pick a warehouse'),
	quantity: z.coerce
		.number('Enter a quantity')
		.int('Whole pieces only')
		.min(0, 'Cannot be negative')
		.max(MAX_STOCK, 'That is more than can be stored')
};

export const addStock = z.object(fields);
export const editStock = z.object({ id: z.coerce.number().int().positive(), ...fields });
export const removeStock = z.object({ id: z.coerce.number().int().positive() });

export type EditStock = z.infer<typeof editStock>;
