import { z } from 'zod/v4';

export const schema = z.object({
	ids: z.array(z.number('No Product Selected')),
	name: z.string('Name for Discount is Required'),
	description: z.string().optional(),
	amount: z.number('Discount Amount is Required').min(0).max(100)
});
