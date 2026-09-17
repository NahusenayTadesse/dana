import { z } from 'zod/v4';

// `payment_methods.name` is varchar(100).
export const paymentMethod = z.object({
	name: z.string('Name of Payment Method is required').trim().min(2).max(100)
});

export const editPaymentMethod = z.object({
	id: z.coerce.number().int().positive(),
	name: z.string('Name of Payment Method is required').trim().min(2).max(100),
	// Inactive methods stay on past transactions but aren't offered for new ones.
	isActive: z.boolean().default(true)
});
export type EditPaymentMethod = z.infer<typeof editPaymentMethod>;
