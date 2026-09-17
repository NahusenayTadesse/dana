import { z } from 'zod/v4';

// A product discount is a PERCENTAGE off the price, applied at checkout.
export const schema = z.object({
	ids: z
		.array(z.number('No Product Selected').int().positive())
		.min(1, 'Select at least one product.'),
	name: z
		.string('Name for Discount is Required')
		.trim()
		.min(1, 'Name for Discount is Required')
		.max(50, 'Discount name must be 50 characters or less.'),
	description: z.string().max(255, 'Description must be 255 characters or less.').optional(),
	amount: z
		.number('Discount percentage is required')
		.min(0, 'Discount cannot be negative.')
		.max(100, 'Discount cannot be more than 100%.')
});
