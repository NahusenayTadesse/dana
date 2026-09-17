import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

export const add = z.object({
	name: z.string().trim().min(1, 'Name is required').max(100),
	code: z.string().trim().max(50).nullable().optional(),
	hexValue: z
		.string()
		.trim()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g. #C1121F)'),
	// Same allowlist as the uploader, so a HEIC swatch fails validation instead
	// of passing it and then crashing the save.
	image: imageFile().optional()
});

export const edit = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string().trim().min(1, 'Name is required').max(100),
	code: z.string().trim().max(50).nullable().optional(),
	hexValue: z
		.string()
		.trim()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color code (e.g. #C1121F)'),
	image: imageFile().optional()
});
export type Edit = z.infer<typeof edit>;
