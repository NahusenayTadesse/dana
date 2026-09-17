import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

export const editGallery = z.object({
	existing: z.string().default(''),
	images: imageFile().array().optional()
});
