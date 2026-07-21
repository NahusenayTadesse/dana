import { z } from 'zod/v4';

export const add = z.object({
	name: z.string().optional(),
	email: z.email().optional(),
	phone: z.string().optional(), // quote_requests.phone is NOT NULL
	tinNo: z.coerce.string().min(10).max(10).optional(),
	docs: z.file().max(10000000).optional(), // not needed to request a quote — keep optional
	selectedProducts: z
		.object({
			amount: z.string( 'Variation is required' ).optional(),
			price: z.number().optional(), 
			product: z.number('Product is required').int(),
			quantity: z.number().int().positive('Number of products must be at least 1')
		})
		.array()
		.min(1, { message: 'Add at least one product before requesting a quote' })
});