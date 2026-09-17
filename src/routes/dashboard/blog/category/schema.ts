import { z } from 'zod/v4';

export const add = z.object({
	name: z.string('Name of Category is required').trim().min(2).max(50),
	description: z.string('Description is required').trim().min(2).max(100)
});

export const edit = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string('Name of Category is required').trim().min(2).max(50),
	description: z.string('Description is required').trim().min(2).max(100)
});
export type Edit = z.infer<typeof edit>;

export const deleteService = z.object({
	id: z.coerce.number().int().positive()
});

export type DeleteService = z.infer<typeof deleteService>;
