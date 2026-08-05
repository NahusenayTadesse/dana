import { z } from 'zod/v4';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

const imageFile = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
	.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.');

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);

export const edit = z.object({
	productName: z.string().min(1, { message: 'Product Name is required.' }),
	brand: z.string().min(1, { message: 'Brand is required.' }),
	category: z.number('Category cannot be empty. Please select a Category').array(),
	tag: z.number('Tag cannot be empty. Please select a Tag').array().optional(),
	commission: z.coerce
		.number()
		.nonnegative({ message: 'Commission must be zero or more.' })
		.default(0),
	description: z
		.string()
		.max(500, { message: "Product description can't be more than 500 characters." })
		.optional(),
	quantity: z.coerce
		.number()
		.int({ message: 'Quantity can only be full numbers, no decimals.' })
		.nonnegative({ message: 'Quantity cannot be negative.' })
		.default(0),
	supplier: z.coerce.number('Supplier is required'),
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
	coatingType: z.string().max(100).optional().nullable(),
	colorOptions: z.string().max(255).optional().nullable(),
	sizeRange: z.string().max(100).optional().nullable(),
	finish: z.string().max(100).optional().nullable(),

	image: imageFile.optional()
});

export const adjust = z.object({
	intent: z.enum(['add', 'remove'], {
		message: 'Please select an adjustment type'
	}),

	costPerItem: z.coerce
		.number('Cost per unit must be a number')
		.min(0, 'Cost per unit must be greater than 0'),

	employeeResponsible: z.coerce.string('Employee is required'),
	quantity: z.coerce.string('Quantity must be greater than 0'),

	reason: z.string().max(255).optional(),
	reciept: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.optional()
});
export type AdjustForm = z.infer<typeof adjust>;

export const damaged = z.object({
	damagedBy: z.coerce.string('Employee is required'),
	quantity: z.coerce.string('Quantity must be greater than 0'),

	reason: z.string().max(255).optional()
});

export type DamagedForm = z.infer<typeof damaged>;

export const editGallery = z.object({
	existing: z.string(),
	gallery: z
		.instanceof(File)
		.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
		.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.')
		.array()
		.optional()
});

export type EditGallery = z.infer<typeof editGallery>;

// A variant's standard price book: one rate per basis (quantity/length/width/
// thickness/color/weight/area). Upsert since basis is unique per variant —
// saving an existing basis just overwrites its rate.
export const upsertVariantPrice = z.object({
	variantId: z.coerce.number('Variant not found'),
	basis: z.enum(['quantity', 'length', 'width', 'thickness', 'color', 'weight', 'area']),
	price: z.coerce.number('Price must be a number').nonnegative('Price cannot be negative.'),
	priceIncludesVat: z.boolean().default(false)
});

export type UpsertVariantPrice = z.infer<typeof upsertVariantPrice>;

export const deleteVariantPrice = z.object({
	id: z.coerce.number('Price rate not found')
});

export type DeleteVariantPrice = z.infer<typeof deleteVariantPrice>;

