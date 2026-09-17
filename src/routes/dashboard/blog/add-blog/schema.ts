import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

export const add = z.object({
	title: z.string('Title is required').trim().min(2).max(100),
	// Optional: the server slugifies it (or the title when it's blank) and makes
	// it unique, so a hand-typed "why-ppgi?" can't produce an unreachable URL.
	slug: z.string().trim().max(200).optional(),
	category: z
		.number('Category is required')
		.int('Category is required')
		.positive('Category is required'),
	excerpt: z.string('Excerpt is required'),
	content: z.string('Long Description is required'),
	image: imageFile(),
	gallery: imageFile().array().optional()
});
