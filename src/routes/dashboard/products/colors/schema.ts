import { z } from 'zod/v4';

export const add = z.object({
	name: z.string().min(1, 'Name is required').max(100),
  code: z.string().max(50).nullable().optional(),
  hexValue: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g. #C1121F)'),
  image: z.file().max(10000000).optional()
 });

export const edit = z.object({
	id: z.number(),
name: z.string().min(1, 'Name is required').max(100),
  code: z.string().max(50).nullable().optional(),
  hexValue: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g. #C1121F)'),

  image: z.file().max(10000000).optional()
});
export type Edit = z.infer<typeof edit>;
