import { z } from 'zod/v4';

export const add = z.object({
	title: z.string('Title is required').min(2).max(100),
	slug: z.string('Slug is required').min(2).max(100),
	category: z
		.number('Category is required')
		.int('Category is required')
		.positive('Category is required'),
	excerpt: z.string('Excerpt is required'),
	content: z.string('Long Description is required'),
	image: z.file('Featured Image is required').max(10000000),
	gallery: z.file('Gallery is required').max(10000000).array().optional()
});
