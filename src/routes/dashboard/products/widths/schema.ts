import { z } from 'zod/v4';
export const widthUnitEnum = z.enum(['mm', 'cm', 'm', 'in', 'ft']);
export const add = z.object({
	value: z
    .string()
    .or(z.number())
    .transform((val) => String(val))
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Must be a valid decimal (up to 2 decimal places)',
    }),
  unit: widthUnitEnum.default('mm'),
  label: z.string().max(50).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const edit = z.object({
	id: z.coerce.string(),
value: z
    .string()
    .or(z.number())
    .transform((val) => String(val))
    .refine((val) => /^\d+(\.\d{1,2})?$/.test(val), {
      message: 'Must be a valid decimal (up to 2 decimal places)',
    }),
  unit: widthUnitEnum.default('mm'),
  label: z.string().max(50).nullable().optional(),
  isActive: z.boolean().default(true),
});
export type Edit = z.infer<typeof edit>;
