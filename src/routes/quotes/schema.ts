import { z } from 'zod/v4';
import { imageOrPdfFile } from '$lib/uploadTypes';

export const quoteRequest = z.object({
	name: z.string().optional(),
	email: z.email().optional(),
	phone: z.string().optional(), // quote_requests.phone is NOT NULL — enforced server-side, same convention as checkout's `add` schema
	whatsapp: z.string().optional(),
	companyName: z.string().optional(),
	tinNo: z.coerce.string().min(10).max(10).optional(),
	// Only what the uploader accepts — HEIC or any other type passed here and then
	// failed inside the save.
	docs: imageOrPdfFile().optional(),
	productId: z.number().int().optional(),
	variantId: z.number().int().optional(),
	categoryId: z.number().int().optional(),
	quantityEstimate: z.string().optional(),
	message: z.string().max(2000).optional()
});