import { z } from 'zod/v4';
import { LENGTH_UNITS } from '$lib/units';
export const widthUnitEnum = z.enum(LENGTH_UNITS);

// decimal(10,2): up to 8 whole digits and 2 decimals.
// Zero isn't a real dimension, so it's rejected too.
const DECIMAL = /^\d{1,8}(\.\d{1,2})?$/;

const value = z
	.string()
	.or(z.number())
	.transform((val) => String(val).trim())
	.refine((val) => DECIMAL.test(val), {
		message: 'Must be a valid number (up to 2 decimal places)'
	})
	.refine((val) => Number(val) > 0, { message: 'Must be greater than 0' });

export const add = z.object({
	value,
	unit: widthUnitEnum.default('mm'),
	label: z.string().trim().max(50).nullable().optional(),
	isActive: z.boolean().default(true)
});

export const edit = z.object({
	id: z.coerce.number().int().positive(),
	value,
	unit: widthUnitEnum.default('mm'),
	label: z.string().trim().max(50).nullable().optional(),
	isActive: z.boolean().default(true)
});
export type Edit = z.infer<typeof edit>;
