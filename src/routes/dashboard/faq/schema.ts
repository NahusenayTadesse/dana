import { z } from 'zod/v4';
import { FAQ_ICONS } from '$lib/faqItems';

/**
 * A stored row's id, or the negative placeholder the page uses for a bundled
 * question that has not been written to the table yet. The actions resolve a
 * negative id to a real row by position, right after seeding.
 */
const faqId = z.coerce
	.number()
	.int()
	.refine((value) => value !== 0, 'Invalid question');

const fields = {
	icon: z.enum(FAQ_ICONS),
	questionEn: z.string('The English question is required').trim().min(5, 'Too short').max(255),
	questionAm: z.string().trim().max(255).optional().nullable(),
	answerEn: z.string('The English answer is required').trim().min(10, 'Too short').max(4000),
	answerAm: z.string().trim().max(4000).optional().nullable(),
	isActive: z.boolean().default(true)
};

export const addFaq = z.object(fields);
export const editFaq = z.object({ id: faqId, ...fields });
export const deleteFaq = z.object({ id: faqId });
export const moveFaq = z.object({
	id: faqId,
	direction: z.enum(['up', 'down'])
});
export const resetFaq = z.object({ confirm: z.literal(true) });

export type AddFaq = z.infer<typeof addFaq>;
export type EditFaq = z.infer<typeof editFaq>;
