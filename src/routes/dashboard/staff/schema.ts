import { z } from 'zod/v4';

// Phone numbers as people write them ("0911 000 000", "+251 911-000-000"):
// digits with optional spaces, dashes, brackets and a leading +, and a sane
// number of digits. Blank is fine — not everyone gives one.
const phone = z
	.string()
	.trim()
	.max(20, 'At most 20 characters')
	.refine(
		(value) => {
			if (value === '') return true;
			if (!/^\+?[\d\s()-]+$/.test(value)) return false;
			const digits = value.replace(/\D/g, '').length;
			return digits >= 9 && digits <= 15;
		},
		{ message: 'Enter a phone number, e.g. 0911 000 000' }
	)
	.optional()
	.nullable();

const fields = {
	name: z.string('A name is required').trim().min(2, 'Too short').max(150),
	role: z.string().trim().max(100).optional().nullable(),
	phone,
	isActive: z.boolean().default(true)
};

export const addStaff = z.object(fields);
export const editStaff = z.object({ id: z.coerce.number().int().positive(), ...fields });

export type EditStaff = z.infer<typeof editStaff>;
