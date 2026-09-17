import { z } from 'zod/v4';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);

/** decimal(12,3) and a signed INT column. */
const MAX_DECIMAL = 999_999_999.999;
const MAX_INT = 2_147_483_647;
const tooBig = 'That is more than can be stored';

const optionalId = z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable());
const optionalQty = z.preprocess(
	emptyToNull,
	z.coerce.number().min(0, 'Cannot be negative').max(MAX_DECIMAL, tooBig).nullable()
);

const fields = {
	batchNumber: z.string('A batch number is required').trim().min(1).max(100),
	variantId: z.coerce.number('Pick the product made').int().positive('Pick the product made'),
	rawMaterialId: optionalId,
	rawMaterialConsumed: optionalQty,
	quantityProduced: z.coerce
		.number('Enter how many were made')
		.int('Whole pieces only')
		.min(0, 'Cannot be negative')
		.max(MAX_INT, tooBig),
	scrapQuantity: optionalQty,
	producedBy: optionalId,
	warehouseId: optionalId,
	productionDate: z.string('A date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
};

// Consumption is taken off a material's on-hand, so an amount with no material
// picked would have nothing to come out of.
const consumedNeedsMaterial = (data: {
	rawMaterialId?: number | null;
	rawMaterialConsumed?: number | null;
}) => !data.rawMaterialConsumed || data.rawMaterialId != null;

const consumedError = {
	message: 'Pick the raw material this was consumed from',
	path: ['rawMaterialId'] as PropertyKey[]
};

export const addBatch = z.object(fields).refine(consumedNeedsMaterial, consumedError);
export const editBatch = z
	.object({ id: z.coerce.number().int().positive(), ...fields })
	.refine(consumedNeedsMaterial, consumedError);

export type EditBatch = z.infer<typeof editBatch>;
