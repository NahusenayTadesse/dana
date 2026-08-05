import { z } from 'zod/v4';

// Customers can only ever request a credit/refund, never offer to pay more —
// so this is always a deduction request; staff reviews and decides the real
// amount when approving.
export const requestAdjustment = z.object({
	orderId: z.coerce.number().int().positive(),
	amount: z.coerce.number().positive('Amount must be greater than 0.'),
	reason: z.string().min(1, 'Please tell us what happened.').max(500)
});

export type RequestAdjustment = z.infer<typeof requestAdjustment>;
