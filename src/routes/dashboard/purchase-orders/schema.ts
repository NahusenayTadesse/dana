import { z } from 'zod/v4';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);
const optionalId = z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable());
const optionalDate = z.preprocess(
	emptyToNull,
	z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date').nullable()
);

export const PO_STATUSES = ['draft', 'ordered', 'in_transit', 'received', 'cancelled'] as const;

const fields = {
	supplierId: z.coerce.number('Pick a supplier').int().positive('Pick a supplier'),
	status: z.enum(PO_STATUSES).default('draft'),
	expectedDate: optionalDate,
	receivedDate: optionalDate,
	raisedBy: optionalId,
	notes: z.string().trim().max(2000).optional().nullable()
};

export const addOrder = z.object(fields);
export const editOrder = z.object({ id: z.coerce.number().int().positive(), ...fields });

/**
 * A line is either a raw material or a finished variant — the table allows
 * buying both, but a line that names neither has nothing to receive against.
 */
const lineFields = {
	purchaseOrderId: z.coerce.number().int().positive(),
	rawMaterialId: optionalId,
	variantId: optionalId,
	quantity: z.coerce.number('Enter a quantity').gt(0, 'Must be more than zero'),
	unitCost: z.preprocess(emptyToNull, z.coerce.number().min(0, 'Cannot be negative').nullable())
};

const oneOrTheOther = (data: { rawMaterialId?: number | null; variantId?: number | null }) =>
	Boolean(data.rawMaterialId) !== Boolean(data.variantId);

const lineError = {
	message: 'Pick either a raw material or a finished product, not both',
	path: ['rawMaterialId'] as PropertyKey[]
};

export const addLine = z.object(lineFields).refine(oneOrTheOther, lineError);
export const editLine = z
	.object({ id: z.coerce.number().int().positive(), ...lineFields })
	.refine(oneOrTheOther, lineError);
export const removeLine = z.object({ id: z.coerce.number().int().positive() });

export type EditOrder = z.infer<typeof editOrder>;
export type EditLine = z.infer<typeof editLine>;
