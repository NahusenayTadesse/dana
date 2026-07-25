import { z } from 'zod/v4';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif'];

const imageFile = z
	.instanceof(File)
	.refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 10MB.`)
	.refine((file) => ACCEPTED_FILE_TYPES.includes(file.type), 'Invalid file type.');

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

export const editPrice = z.object({
	id: z.number('Price Not found'),
	price: z.coerce.number('Price must be a number'),
	amount: z.string('Product Variation is required'),
	image: z.file().max(10000000).optional()
});

export type EditPrice = z.infer<typeof editPrice>;

export const addPrice = z.object({
	price: z.coerce.number('Price must be a number'),
	amount: z.string('Product Variation is required'),
		image: z.file().max(10000000).optional()

});

export type AddPrice = z.infer<typeof addPrice>;
