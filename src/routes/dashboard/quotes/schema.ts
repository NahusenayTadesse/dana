import { z } from 'zod/v4';

export const markRead = z.object({
	id: z.coerce.number()
});
export type MarkRead = z.infer<typeof markRead>;

export const deleteQuote = z.object({
	id: z.coerce.number()
});
export type DeleteQuote = z.infer<typeof deleteQuote>;

export const replySchema = z
	.object({
		quoteRequestId: z.coerce.number(),
		subject: z.string().min(1, 'Subject is required'),
		message: z.string().min(1, 'Message is required'),
		quotedUnitPrice: z.coerce.number().positive().optional(),
		quotedQuantity: z.coerce.number().int().positive().optional()
	})
	.refine(
		(data) =>
			(data.quotedUnitPrice === undefined && data.quotedQuantity === undefined) ||
			(data.quotedUnitPrice !== undefined && data.quotedQuantity !== undefined),
		{
			message: 'Provide both a unit price and quantity to send a priced quote — or leave both blank for a plain reply.',
			path: ['quotedUnitPrice']
		}
	);
export type ReplySchema = z.infer<typeof replySchema>;