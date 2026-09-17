import { z } from 'zod/v4';

// Trimmed so " Red" and "Red" can't both be saved as separate tags.
export const add = z.object({
	name: z.string('Name is required').trim().min(2).max(50)
});

export const edit = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string('Name is required').trim().min(2).max(50)
});
export type Edit = z.infer<typeof edit>;
