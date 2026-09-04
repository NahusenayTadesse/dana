import { z } from 'zod/v4';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);
const optionalId = z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable());
const optionalQty = z.preprocess(emptyToNull, z.coerce.number().min(0, 'Cannot be negative').nullable());

const fields = {
	batchNumber: z.string('A batch number is required').trim().min(1).max(100),
	variantId: z.coerce.number('Pick the product made').int().positive('Pick the product made'),
	rawMaterialId: optionalId,
	rawMaterialConsumed: optionalQty,
	quantityProduced: z.coerce.number('Enter how many were made').int().min(0, 'Cannot be negative'),
	scrapQuantity: optionalQty,
	producedBy: optionalId,
	warehouseId: optionalId,
	productionDate: z
		.string('A date is required')
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
};

export const addBatch = z.object(fields);
export const editBatch = z.object({ id: z.coerce.number().int().positive(), ...fields });

export type EditBatch = z.infer<typeof editBatch>;
