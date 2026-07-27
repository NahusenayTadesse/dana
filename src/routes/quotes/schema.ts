import { z } from 'zod/v4';

export const quoteRequest = z.object({
	name: z.string().optional(),
	email: z.email().optional(),
	phone: z.string().optional(), // quote_requests.phone is NOT NULL — enforced server-side, same convention as checkout's `add` schema
	whatsapp: z.string().optional(),
	companyName: z.string().optional(),
	tinNo: z.coerce.string().min(10).max(10).optional(),
	docs: z.file().max(10000000).optional(),
	productId: z.number().int().optional(),
	variantId: z.number().int().optional(),
	categoryId: z.number().int().optional(),
	quantityEstimate: z.string().optional(),
	message: z.string().max(2000).optional()
});