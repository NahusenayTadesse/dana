import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

// Only the image types $lib/server/upload.ts will actually store. HEIC/HEIF and
// PDF used to pass here and then made the upload throw (a 500 page).
// An empty (0-byte) File from an untouched input counts as "no file".
const noEmptyFile = (v: unknown) => (v instanceof File && v.size === 0 ? undefined : v);
const optionalImage = z.preprocess(noEmptyFile, imageFile().optional().nullable());

// Empty string / undefined -> null, so optional numeric fields don't
// coerce "" (or null) into 0 and then fail downstream checks.
const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

export const add = z.object({
	name: z
		.string()
		.min(1, 'Product Name is required.')
		.max(100, 'Name must be 100 characters or less.'),
	// Normalised server-side with slugify() — "roof/tile" or "Why PPGI?" would
	// otherwise produce a /shop/single/<slug> URL that 404s. Blank = from the name.
	slug: z.string().max(120, 'Slug must be 120 characters or less.').default(''),
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
	image: optionalImage,
	gallery: z.preprocess(
		(v) => (Array.isArray(v) ? v.filter((f) => !(f instanceof File && f.size === 0)) : v),
		imageFile().array().optional()
	),
	description: z
		.string()
		.max(255, { message: "Product description can't be more than 255 characters." })
		.optional()
		.nullable(),
	overview: z.string().optional().nullable(),

	// Retail fields. There is no quantity here: stock belongs to variants and
	// warehouses (see $lib/server/stock) — a new product has none until a
	// variant is added with an opening quantity.
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
	// Lets the storefront's length stepper (e.g. /buy) dial length up/down
	// freely between minLength and maxLength in lengthStep increments,
	// instead of only offering the catalog's fixed length variants.
	isLengthCustomizable: z.boolean().default(false),
	minLength: z.preprocess(
		emptyToNull,
		z.coerce.number().positive('Min length must be a positive number.').nullable()
	),
	lengthStep: z.preprocess(
		emptyToNull,
		z.coerce.number().positive('Length step must be a positive number.').nullable()
	),
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