import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

// Only the image types $lib/server/upload.ts will actually store; an empty
// (0-byte) File from an untouched input counts as "no file".
const noEmptyFile = (v: unknown) => (v instanceof File && v.size === 0 ? undefined : v);
const imageFiles = z.preprocess(
	(v) => (Array.isArray(v) ? v.filter((f) => !(f instanceof File && f.size === 0)) : v),
	imageFile().array().optional()
);

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);

// A required positive id posted from a <select> (may arrive as a string).
const requiredId = (message: string) =>
	z.preprocess(
		(v) => (v === '' || v == null ? undefined : v),
		z.coerce.number({ error: message }).int(message).positive(message)
	);

export const edit = z.object({
	productName: z
		.string()
		.min(1, { message: 'Product Name is required.' })
		.max(100, 'Name must be 100 characters or less.'),
	// Optional, as on add — existing products without a brand must stay editable.
	brand: z.string().max(100, 'Brand must be 100 characters or less.').optional().nullable(),
	// products.categoryId is the single source of truth for a product's category.
	categoryId: requiredId('Category is required.'),
	tag: z.number('Tag cannot be empty. Please select a Tag').array().optional(),
	commission: z.coerce
		.number()
		.nonnegative({ message: 'Commission must be zero or more.' })
		.default(0),
	// products.description is varchar(255).
	description: z
		.string()
		.max(255, { message: "Product description can't be more than 255 characters." })
		.optional()
		.nullable(),
	// No quantity: stock is the synced total of the variants' warehouse rows.
	supplier: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
	reorderLevel: z.coerce
		.number()
		.int({ message: 'Reorder Level can only be full numbers, no decimals.' })
		.nonnegative({ message: 'Reorder Level cannot be negative.' })
		.default(0),

	soldBy: z.enum(['quantity', 'length', 'both']).default('quantity'),
	thickness: z.string().max(100).optional().nullable(),
	width: z.string().max(100).optional().nullable(),
	maxLength: z.preprocess(
		emptyToNull,
		z.coerce.number().positive('Max length must be a positive number.').nullable()
	),
	maxLengthUnit: z.enum(['mm', 'm', 'ft']).default('m'),
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

	image: z.preprocess(noEmptyFile, imageFile().optional().nullable())
});

// Stock movements are per variant (stock lives in warehouses), so both the
// adjustment and the damaged forms say which variant's stock they move.
const quantity = z.preprocess(
	(v) => (v === '' || v == null ? undefined : v),
	z.coerce
		.number({ error: 'Quantity is required.' })
		.int('Quantity must be a whole number.')
		.positive('Quantity must be at least 1.')
		.max(1_000_000, 'Quantity is too large.')
);

export const adjust = z.object({
	variantId: requiredId('Choose which variant’s stock to change.'),
	intent: z.enum(['add', 'remove'], {
		message: 'Please select an adjustment type'
	}),

	costPerItem: z.preprocess(
		(v) => (v === '' || v == null ? 0 : v),
		z.coerce
			.number('Cost per unit must be a number')
			.min(0, 'Cost per unit cannot be negative.')
			.max(10_000_000, 'Cost per unit is too large.')
	),

	employeeResponsible: z
		.string('Employee is required')
		.trim()
		.min(1, 'Employee is required')
		.max(100, 'Employee name must be 100 characters or less.'),
	quantity,

	reason: z.string().trim().max(200, 'Reason must be 200 characters or less.').optional(),
	reciept: z.preprocess(noEmptyFile, imageFile().optional().nullable())
});
export type AdjustForm = z.infer<typeof adjust>;

export const damaged = z.object({
	variantId: requiredId('Choose which variant was damaged.'),
	// damaged_products.damaged_by is varchar(36).
	damagedBy: z
		.string('Employee is required')
		.trim()
		.min(1, 'Employee is required')
		.max(36, 'Employee name must be 36 characters or less.'),
	quantity,
	// damaged_products.reason is NOT NULL varchar(255).
	reason: z
		.string('Reason is required')
		.trim()
		.min(1, 'Reason is required')
		.max(255, 'Reason must be 255 characters or less.')
});

export type DamagedForm = z.infer<typeof damaged>;

export const editGallery = z.object({
	existing: z.string().default(''),
	gallery: imageFiles
});

export type EditGallery = z.infer<typeof editGallery>;

// A variant's standard price book: one rate per basis (quantity/length/width/
// thickness/color/weight/area). Upsert since basis is unique per variant —
// saving an existing basis just overwrites its rate.
export const upsertVariantPrice = z.object({
	variantId: z.coerce.number('Variant not found').int().positive('Variant not found'),
	basis: z.enum(['quantity', 'length', 'width', 'thickness', 'color', 'weight', 'area']),
	// A 0 rate would be charged as free at checkout; delete the rate instead to
	// make the variant quote-only.
	price: z.coerce
		.number('Price must be a number')
		.positive('Price must be greater than 0. Delete the rate to make it quote-only.')
		.max(9_999_999_999, 'Price is too large.'),
	priceIncludesVat: z.boolean().default(false)
});

export type UpsertVariantPrice = z.infer<typeof upsertVariantPrice>;

export const deleteVariantPrice = z.object({
	id: z.coerce.number('Price rate not found').int().positive('Price rate not found')
});

export type DeleteVariantPrice = z.infer<typeof deleteVariantPrice>;
