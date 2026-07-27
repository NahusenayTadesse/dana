import { z } from 'zod/v4';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif'
];

// Empty string / undefined -> null so an unselected <select> or blank number
// field doesn't coerce to 0 and violate an FK (or fail a positive() check).
const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

// Optional FK to a lookup table (colours / widths / thicknesses / lengths).
const optionalId = z.preprocess(
	emptyToNull,
	z.coerce.number().int().positive().nullable()
);

const variantImage = z
	.instanceof(File)
	.refine((f) => f.size <= MAX_FILE_SIZE, 'Max file size is 10MB.')
	.refine(
		(f) => f.size === 0 || ACCEPTED_FILE_TYPES.includes(f.type),
		'Invalid file type.'
	)
	.optional()
	.nullable();

export const addVariant = z.object({
	colorId: optionalId,
	widthId: optionalId,
	thicknessId: optionalId,
	lengthId: optionalId,

	sku: z.string().max(100, 'SKU must be 100 characters or less.').optional().nullable(),

	// productVariants.price is nullable — a blank price means "quote-only".
	price: z.preprocess(
		emptyToNull,
		z.coerce.number().nonnegative('Price cannot be negative.').nullable()
	),

	// quantity is NOT NULL DEFAULT 0
	quantity: z
		.preprocess(
			(v) => (v === '' || v == null ? 0 : v),
			z.coerce
				.number()
				.int('Quantity must be a whole number.')
				.nonnegative('Quantity cannot be negative.')
		)
		.default(0),

	reorderLevel: z.preprocess(
		emptyToNull,
		z.coerce
			.number()
			.int('Reorder level must be a whole number.')
			.positive('Reorder level must be a positive number.')
			.nullable()
	),

	image: variantImage
});

// Edit is the same shape plus the row id.
export const editVariant = addVariant.extend({
	id: z.number('Variant not found')
});

export type AddVariant = z.infer<typeof addVariant>;
export type EditVariant = z.infer<typeof editVariant>;
