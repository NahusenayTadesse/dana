import { z } from 'zod/v4';

export const markRead = z.object({
	id: z.coerce.number().int().positive()
});

export type MarkRead = z.infer<typeof markRead>;

export const deleteMessage = z.object({
	id: z.coerce.number().int().positive()
});

export type DeleteMessage = z.infer<typeof deleteMessage>;
