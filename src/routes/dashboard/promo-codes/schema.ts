import { z } from 'zod/v4';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);

/** A date the browser's native date input produces, or nothing at all. */
const optionalDate = z.preprocess(
	emptyToNull,
	z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date')
		.nullable()
);

const fields = {
	// Stored uppercase so a customer typing "newyear" matches "NEWYEAR". The
	// column is unique, so the casing has to be settled before it reaches MySQL.
	code: z
		.string('Code is required')
		.trim()
		.min(2, 'Code must be at least 2 characters')
		.max(50, 'Code cannot be longer than 50 characters')
		.regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, 'Use letters, numbers, - and _ only'),
	discountPercentage: z.coerce
		.number('Discount is required')
		.gt(0, 'Discount must be more than 0%')
		.max(100, 'Discount cannot be more than 100%'),
	reason: z.string().trim().max(255).optional().nullable(),
	startsAt: optionalDate,
	expiresAt: optionalDate,
	// Blank means unlimited, which is what the quotes screen reads as `null`.
	maxUses: z.preprocess(emptyToNull, z.coerce.number().int().positive('Must be at least 1').nullable()),
	isActive: z.boolean().default(true)
};

// The window is checked here as well as on save so the error lands on the field
// rather than as a toast the operator has to guess at.
const orderedWindow = (data: { startsAt?: string | null; expiresAt?: string | null }) =>
	!data.startsAt || !data.expiresAt || data.startsAt <= data.expiresAt;

const windowError = {
	message: 'The end date cannot be before the start date',
	path: ['expiresAt'] as PropertyKey[]
};

export const add = z.object(fields).refine(orderedWindow, windowError);

export const edit = z
	.object({ id: z.coerce.number().int().positive(), ...fields })
	.refine(orderedWindow, windowError);

export type Add = z.infer<typeof add>;
export type Edit = z.infer<typeof edit>;
