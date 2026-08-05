import { z } from 'zod/v4';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
const ACCEPTED_FILE_TYPES = [
	'image/jpeg', // Common for both platforms
	'image/png', // Common for both platforms (and screenshots)
	'image/webp', // Common modern format (often Android screenshots/exports)
	'image/heic', // High Efficiency Image File (iOS default)
	'image/heif', // High Efficiency Image File (related to HEIC)
	'application/pdf' // Document format, kept from original
];

// Empty string / undefined -> null, so optional numeric fields don't
// coerce "" (or null) into 0 and then fail downstream checks.
const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

export const add = z.object({
	name: z
		.string()
		.min(1, 'Product Name is required.')
		.max(100, 'Name must be 100 characters or less.'),
	slug: z.string().min(1, 'Slug is required.').max(120, 'Slug must be 120 characters or less.'),
	brand: z.string().max(100, 'Brand must be 100 characters or less.').optional().nullable(),

	// Required FK. Coerce because the <select> may hand us a string, and guard
	// against null/empty coercing to 0 (which would violate the FK).
	categoryId: z.preprocess(
		(v) => (v === '' || v == null ? undefined : v),
		z.coerce
			.number({ error: 'Category is required.' })
			.int('Category is required.')
			.positive('Category is required.')
	),

	// Images & text blocks
	image: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine(
			(file) => file.size === 0 || ACCEPTED_FILE_TYPES.includes(file.type),
			'Invalid file type.'
		)
		.optional()
		.nullable(),
	gallery: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine(
			(file) => file.size === 0 || ACCEPTED_FILE_TYPES.includes(file.type),
			'Invalid file type.'
		)
		.array()
		.optional(),
	description: z
		.string()
		.max(255, { message: "Product description can't be more than 255 characters." })
		.optional()
		.nullable(),
	overview: z.string().optional().nullable(),

	// Retail / inventory fields
	quantity: z
		.preprocess(
			(v) => (v === '' || v == null ? 0 : v),
			z.coerce
				.number()
				.int({ message: 'Quantity can only be full numbers, no decimals.' })
				.nonnegative({ message: 'Quantity cannot be negative.' })
		)
		.default(0),

	// decimal(10,2) NOT NULL DEFAULT '0'. Kept as a string for precision, but
	// normalise empty -> '0' and validate the shape so we never insert '' or junk.
	commissionAmount: z
		.string()
		.default('0')
		.transform((v) => (v.trim() === '' ? '0' : v.trim()))
		.refine((v) => /^\d+(\.\d{1,2})?$/.test(v), {
			message: 'Enter a valid amount, e.g. 12.50'
		}),

	supplierId: z.preprocess(
		emptyToNull,
		z.coerce.number().int().positive().nullable()
	),

	reorderLevel: z.preprocess(
		emptyToNull,
		z.coerce
			.number()
			.int({ message: 'Reorder Level can only be full numbers, no decimals.' })
			.positive({ message: 'Reorder Level must be a positive number.' })
			.nullable()
	),

	// How this product is sold — drives which quantities the storefront/quote
	// flow asks for.
	soldBy: z.enum(['quantity', 'length', 'both']).default('quantity'),

	// Technical specifications
	thickness: z.string().max(100).optional().nullable(),
	width: z.string().max(100).optional().nullable(),
	// Cap on custom-length quote requests (mm/m/ft). Only meaningful when
	// soldBy is 'length' or 'both', but left valid either way.
	maxLength: z.preprocess(
		emptyToNull,
		z.coerce.number().positive('Max length must be a positive number.').nullable()
	),
	maxLengthUnit: z.enum(['mm', 'm', 'ft']).default('m'),
	coatingType: z.string().max(100).optional().nullable(),
	colorOptions: z.string().max(255).optional().nullable(),
	sizeRange: z.string().max(100).optional().nullable(),
	finish: z.string().max(100).optional().nullable(),

	// Supporting content blocks
	performanceFeatures: z.string().optional().nullable(),
	advantages: z.string().optional().nullable(),
	applications: z.string().optional().nullable(),

	isFeaturedOnHome: z.boolean().default(false)
});