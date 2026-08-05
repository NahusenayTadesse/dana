import { z } from 'zod/v4';

export const add = z.object({
	name: z.string().optional(),
	email: z.email().optional(),
	phone: z.string().optional(), // quote_requests.phone is NOT NULL
	tinNo: z.coerce.string().min(10).max(10).optional(),
	docs: z.file().max(10000000).optional(), // not needed to request a quote — keep optional
	type: z.enum(['company', 'individual'], 'Customer type is required').default('individual'),

	selectedProducts: z
		.object({
			amount: z.string('Variation is required').optional(), // human-readable spec label
			price: z.number().optional(),
			product: z.number('Product is required').int(),
			variantId: z.number().int().optional(),
			quantity: z.number().int().positive('Number of products must be at least 1'),
			priceIncludesVat: z.boolean().optional(),
			colorId: z.number().int().nullable().optional(),
			width: z.number().nullable().optional(),
			widthUnit: z.enum(['mm', 'cm', 'm', 'in', 'ft']).nullable().optional(),
			thickness: z.number().nullable().optional(),
			thicknessUnit: z.enum(['mm', 'gauge']).nullable().optional(),
			length: z.number().nullable().optional(),
			lengthUnit: z.enum(['mm', 'm', 'ft']).nullable().optional()
		})
		.array()
		.min(1, { message: 'Add at least one product before requesting a quote' })
});