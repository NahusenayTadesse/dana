import { z } from 'zod/v4';

export const markRead = z.object({
	id: z.coerce.number()
});
export type MarkRead = z.infer<typeof markRead>;

export const deleteQuote = z.object({
	id: z.coerce.number()
});
export type DeleteQuote = z.infer<typeof deleteQuote>;

// Plain correspondence only now — pricing lives in the price-offer builder
// on the quote's detail page (see [id]/schema.ts), not in a reply field.
export const replySchema = z.object({
	quoteRequestId: z.coerce.number(),
	subject: z.string().min(1, 'Subject is required'),
	message: z.string().min(1, 'Message is required')
});
export type ReplySchema = z.infer<typeof replySchema>;