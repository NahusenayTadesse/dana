import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

export const edit = z.object({
	title: z.string('Title is required').trim().min(2).max(100),
	// Slugified and made unique on the server; blank falls back to the title.
	slug: z.string().trim().max(200).optional(),
	category: z.number('Category is required').int().positive('Category is required'),
	excerpt: z.string('Excerpt is required'),
	content: z.string('Long Description is required'),
	image: imageFile().optional()
});

export type EditBlog = z.infer<typeof edit>;

export const editGallery = z.object({
	existing: z.string().default(''),
	gallery: imageFile().array().optional()
});

export type EditGallery = z.infer<typeof editGallery>;
