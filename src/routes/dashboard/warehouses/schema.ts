import { z } from 'zod/v4';

const fields = {
	name: z.string('A name is required').trim().min(2, 'Too short').max(150),
	location: z.string().trim().max(255).optional().nullable(),
	isDefault: z.boolean().default(false),
	isActive: z.boolean().default(true)
};

export const addWarehouse = z.object(fields);
export const editWarehouse = z.object({ id: z.coerce.number().int().positive(), ...fields });

export type EditWarehouse = z.infer<typeof editWarehouse>;
