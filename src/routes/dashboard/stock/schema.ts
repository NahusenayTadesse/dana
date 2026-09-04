import { z } from 'zod/v4';

const fields = {
	variantId: z.coerce.number('Pick a product').int().positive('Pick a product'),
	warehouseId: z.coerce.number('Pick a warehouse').int().positive('Pick a warehouse'),
	quantity: z.coerce.number('Enter a quantity').int().min(0, 'Cannot be negative')
};

export const addStock = z.object(fields);
export const editStock = z.object({ id: z.coerce.number().int().positive(), ...fields });
export const removeStock = z.object({ id: z.coerce.number().int().positive() });

export type EditStock = z.infer<typeof editStock>;
