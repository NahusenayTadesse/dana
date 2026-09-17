import { z } from 'zod/v4';

export const add = z.object({
	name: z.string('Name is required').trim().min(2).max(50),
	description: z.string('Description is required').trim().min(2).max(100),
	status: z.boolean('Status is required').default(true)
});

export const edit = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string('Name is required').trim().min(2).max(50),
	description: z.string('Description is required').trim().min(2).max(100),
	status: z.boolean('Status is required').default(true)
});
export type Edit = z.infer<typeof edit>;
