import { z } from 'zod/v4';
import { imageFile } from '$lib/uploadTypes';

// Avatars render as <img>, so only images the uploader accepts are allowed —
// no HEIC/HEIF (rejected by the uploader) and no PDF (a broken image).
export const addTestimonial = z.object({
	name: z.string('Name is required').trim().min(2).max(50),
	position: z.string().trim().max(255).optional(),
	testimonial: z.string('Testimonial is required').trim().min(2, 'Testimonial is required'),
	avatar: imageFile(),
	// Added by staff, so it goes live straight away unless unticked.
	isApproved: z.boolean().default(true)
});

export const editTestimonial = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string('Name is required').trim().min(2).max(50),
	position: z.string().trim().max(255).optional(),
	testimonial: z.string('Testimonial is required').trim().min(2, 'Testimonial is required'),
	// Optional on edit: a required file meant correcting a typo in the text
	// failed validation unless the avatar was uploaded again.
	avatar: imageFile().optional(),
	isApproved: z.boolean().default(true)
});

export type EditTestimonial = z.infer<typeof editTestimonial>;

export const deleteTestimonial = z.object({
	id: z.coerce.number().int().positive()
});

export type DeleteTestimonial = z.infer<typeof deleteTestimonial>;
