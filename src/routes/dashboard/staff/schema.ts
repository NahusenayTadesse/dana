import { z } from 'zod/v4';

const fields = {
	name: z.string('A name is required').trim().min(2, 'Too short').max(150),
	role: z.string().trim().max(100).optional().nullable(),
	phone: z.string().trim().max(20).optional().nullable(),
	isActive: z.boolean().default(true)
};

export const addStaff = z.object(fields);
export const editStaff = z.object({ id: z.coerce.number().int().positive(), ...fields });

export type EditStaff = z.infer<typeof editStaff>;
