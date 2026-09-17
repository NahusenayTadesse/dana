import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

// Empty string / undefined -> null so an unselected <select> or blank number
// field doesn't coerce to 0 and violate an FK (or fail a positive() check).
const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

// Optional FK to a lookup table (colours / widths / thicknesses / lengths).
const optionalId = z.preprocess(
	emptyToNull,
	z.coerce.number().int().positive().nullable()
);

// Only the image types $lib/server/upload.ts will actually store (no HEIC/HEIF);
// an empty (0-byte) File from an untouched input counts as "no file".
const variantImage = z.preprocess(
	(v) => (v instanceof File && v.size === 0 ? undefined : v),
	imageFile().optional().nullable()
);

const variantFields = z.object({
	colorId: optionalId,
	widthId: optionalId,
	thicknessId: optionalId,
	lengthId: optionalId,

	sku: z.string().max(100, 'SKU must be 100 characters or less.').optional().nullable(),

	// productVariants.price is nullable — a blank price means "quote-only".
	// 0 is rejected rather than stored: the admin shows 0 as "Quote only" while
	// checkout would have charged nothing for it.
	price: z.preprocess(
		emptyToNull,
		z.coerce
			.number()
			.positive('Price must be greater than 0 — leave it blank for quote-only.')
			.max(99_999_999, 'Price is too large.')
			.nullable()
	),

	// nonnegative, not positive — the column is nullable with no default, so an
	// existing row can legitimately hold 0 and must stay editable.
	reorderLevel: z.preprocess(
		emptyToNull,
		z.coerce
			.number()
			.int('Reorder level must be a whole number.')
			.nonnegative('Reorder level cannot be negative.')
			.max(1_000_000, 'Reorder level is too large.')
			.nullable()
	),

	image: variantImage
});

// Add takes an opening stock quantity, which is booked into the default
// warehouse (stock_levels is the source of truth — see $lib/server/stock).
export const addVariant = variantFields.extend({
	quantity: z
		.preprocess(
			(v) => (v === '' || v == null ? 0 : v),
			z.coerce
				.number()
				.int('Quantity must be a whole number.')
				.nonnegative('Quantity cannot be negative.')
				.max(1_000_000, 'Quantity is too large.')
		)
		.default(0)
});

// Edit is the same fields plus the row id. No quantity: after creation stock
// only moves through stock movements (Stock page, Adjust / Damaged dialogs),
// so a stale dialog can't overwrite a newer count.
export const editVariant = variantFields.extend({
	id: z.number('Variant not found').int().positive('Variant not found')
});

export type AddVariant = z.infer<typeof addVariant>;
export type EditVariant = z.infer<typeof editVariant>;
