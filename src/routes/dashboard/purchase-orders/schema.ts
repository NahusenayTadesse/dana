import { z } from 'zod/v4';
import { CREATE_STATUSES } from './types';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);
const optionalId = z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable());
const optionalDate = z.preprocess(
	emptyToNull,
	z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
		.nullable()
);

/** True when `value` has no more than `places` decimals (float-noise tolerant). */
const hasDecimals = (value: number, places: number) => {
	const scaled = value * 10 ** places;
	return Math.abs(scaled - Math.round(scaled)) < 1e-6;
};

export const PO_STATUSES = ['draft', 'ordered', 'in_transit', 'received', 'cancelled'] as const;

const fields = {
	supplierId: z.coerce.number('Pick a supplier').int().positive('Pick a supplier'),
	expectedDate: optionalDate,
	receivedDate: optionalDate,
	raisedBy: optionalId,
	notes: z.string().trim().max(2000).optional().nullable()
};

export const addOrder = z.object({ ...fields, status: z.enum(CREATE_STATUSES).default('draft') });
export const editOrder = z.object({
	id: z.coerce.number().int().positive(),
	...fields,
	status: z.enum(PO_STATUSES).default('draft')
});

/**
 * A line is either a raw material or a finished variant — the table allows
 * buying both, but a line that names neither has nothing to receive against.
 * The purchase order it belongs to always comes from the URL, never the form,
 * so a line can't be added to or moved onto another PO.
 */
const lineFields = {
	rawMaterialId: optionalId,
	variantId: optionalId,
	// decimal(12,3)
	quantity: z.coerce
		.number('Enter a quantity')
		.min(0.001, 'Must be more than zero')
		.max(999_999_999.999, 'That is more than can be stored')
		.refine((q) => hasDecimals(q, 3), 'At most 3 decimal places'),
	// decimal(10,2)
	unitCost: z.preprocess(
		emptyToNull,
		z.coerce
			.number()
			.min(0, 'Cannot be negative')
			.max(99_999_999.99, 'That is more than can be stored')
			.refine((c) => hasDecimals(c, 2), 'At most 2 decimal places')
			.nullable()
	)
};

type LineShape = { rawMaterialId?: number | null; variantId?: number | null; quantity: number };

const oneOrTheOther = (data: LineShape) => Boolean(data.rawMaterialId) !== Boolean(data.variantId);

const lineError = {
	message: 'Pick either a raw material or a finished product, not both',
	path: ['rawMaterialId'] as PropertyKey[]
};

// Finished goods are counted in whole pieces in warehouse stock.
const wholePieces = (data: LineShape) => !data.variantId || Number.isInteger(data.quantity);

const wholePiecesError = {
	message: 'Finished products are counted in whole pieces',
	path: ['quantity'] as PropertyKey[]
};

export const addLine = z
	.object(lineFields)
	.refine(oneOrTheOther, lineError)
	.refine(wholePieces, wholePiecesError);
export const editLine = z
	.object({ id: z.coerce.number().int().positive(), ...lineFields })
	.refine(oneOrTheOther, lineError)
	.refine(wholePieces, wholePiecesError);
export const removeLine = z.object({ id: z.coerce.number().int().positive() });

export type EditOrder = z.infer<typeof editOrder>;
export type EditLine = z.infer<typeof editLine>;
