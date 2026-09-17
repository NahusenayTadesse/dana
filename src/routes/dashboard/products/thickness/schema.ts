import { z } from 'zod/v4';
import { THICKNESS_UNITS } from '$lib/units';
export const widthUnitEnum = z.enum(THICKNESS_UNITS);

// decimal(10,3): up to 7 whole digits and 3 decimals — gauges like 0.425mm matter.
// Zero isn't a real dimension, so it's rejected too.
const DECIMAL = /^\d{1,7}(\.\d{1,3})?$/;

const value = z
	.string()
	.or(z.number())
	.transform((val) => String(val).trim())
	.refine((val) => DECIMAL.test(val), {
		message: 'Must be a valid number (up to 3 decimal places)'
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
