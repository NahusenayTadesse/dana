import { z } from 'zod/v4';
import { imageOrPdfFile } from '$lib/uploadTypes';

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

const orderLine = z.object({
	productId: z.coerce.number().int().positive('Select a product.'),
	variantId: z.coerce.number().int().positive('Select a variant.'),
	quantity: z.coerce.number().int().positive('Quantity must be at least 1.').max(1_000_000)
});

// Same MIME allowlist as the uploader — HEIC/HEIF used to pass here and then
// throw inside the action.
const receipt = imageOrPdfFile().optional().nullable();

const base = {
	customer: z.coerce.number().int().positive('Select a customer.'),
	status: z.enum(['pending', 'delivered', 'cancelled']).default('pending'),
	paymentMethod: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
	reciept: receipt
};

// A new order booked straight into `delivered` has collected nothing yet, so
// the method is always required. On edit the server decides (it knows whether
// the order is already fully paid) — a client-sent "already paid by gateway"
// flag used to relax this without being checked.
export const add = z
	.object({ ...base, items: z.array(orderLine).min(1, 'Add at least one product.') })
	.superRefine((val, ctx) => {
		if (val.status === 'delivered' && !val.paymentMethod) {
			ctx.addIssue({
				code: 'custom',
				path: ['paymentMethod'],
				message: 'Payment method is required for delivered orders.'
			});
		}
	});

// Items may be empty on edit: orders priced in the quote builder don't send
// their lines (they can only be changed there). The server requires at least
// one line for every other order.
export const edit = z.object({
	...base,
	id: z.coerce.number().int().positive(),
	items: z.array(orderLine).default([])
});

// Generates a fresh payment link for whatever's still owed on an order —
// callable at any time (delivered or not), not just right after a quote.
export const requestBalance = z.object({
	orderId: z.coerce.number().int().positive()
});

// Staff creating a post-dispatch correction directly — takes effect
// immediately (no separate approval step; staff already has the authority).
export const addAdjustment = z.object({
	orderId: z.coerce.number().int().positive(),
	type: z.enum(['addition', 'deduction']),
	// decimal(12,2) column
	amount: z.coerce
		.number()
		.positive('Amount must be greater than 0.')
		.max(9_999_999_999, 'Amount is too large.'),
	reason: z.string().min(1, 'Reason is required.').max(255),
	notes: z.string().max(2000).optional().nullable()
});

// Approve/reject a customer-submitted adjustment request.
export const decideAdjustment = z.object({
	adjustmentId: z.coerce.number().int().positive(),
	approve: z.boolean(),
	note: z.string().max(500).optional().nullable()
});

export type Add = z.infer<typeof add>;
export type Edit = z.infer<typeof edit>;
export type RequestBalance = z.infer<typeof requestBalance>;
export type AddAdjustment = z.infer<typeof addAdjustment>;
export type DecideAdjustment = z.infer<typeof decideAdjustment>;
