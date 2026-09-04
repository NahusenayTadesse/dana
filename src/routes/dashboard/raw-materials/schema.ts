import { z } from 'zod/v4';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);

const fields = {
	name: z.string('A name is required').trim().min(2, 'Too short').max(150),
	supplierId: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
	unit: z.enum(['kg', 'ton', 'm', 'coil']).default('ton'),
	quantityOnHand: z.coerce.number('Enter a quantity').min(0, 'Cannot be negative'),
	reorderLevel: z.preprocess(emptyToNull, z.coerce.number().min(0, 'Cannot be negative').nullable()),
	isActive: z.boolean().default(true)
};

export const addMaterial = z.object(fields);
export const editMaterial = z.object({ id: z.coerce.number().int().positive(), ...fields });

export type EditMaterial = z.infer<typeof editMaterial>;
