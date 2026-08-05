import { z } from 'zod/v4';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/heic',
	'image/heif',
	'application/pdf'
];

const emptyToNull = (v: unknown) => (v === '' || v === undefined ? null : v);

const orderLine = z.object({
	productId: z.coerce.number().int().positive('Select a product.'),
	variantId: z.coerce.number().int().positive('Select a variant.'),
	quantity: z.coerce.number().int().positive('Quantity must be at least 1.')
});

const receipt = z
	.instanceof(File)
	.refine((f) => f.size <= MAX_FILE_SIZE, 'Max file size is 10MB.')
	.refine((f) => f.size === 0 || ACCEPTED_FILE_TYPES.includes(f.type), 'Invalid file type.')
	.optional()
	.nullable();

const base = {
	customer: z.coerce.number().int().positive('Select a customer.'),
	status: z.enum(['pending', 'delivered', 'cancelled']).default('pending'),
	items: z.array(orderLine).min(1, 'Add at least one product.'),
	paymentMethod: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
	reciept: receipt,
	// Set by the client when the order was already settled by the gateway.
	// The server re-verifies against the DB — this only relaxes validation.
	gatewayPaid: z.boolean().default(false)
};

// Delivered orders need a payment method UNLESS the gateway already settled it.
const requirePaymentWhenDelivered = (
	val: { status: string; paymentMethod: number | null; gatewayPaid?: boolean },
	ctx: z.RefinementCtx
) => {
	if (val.status === 'delivered' && !val.gatewayPaid && !val.paymentMethod) {
		ctx.addIssue({
			code: 'custom',
			path: ['paymentMethod'],
			message: 'Payment method is required for delivered orders.'
		});
	}
};

export const add = z.object(base).superRefine(requirePaymentWhenDelivered);
export const edit = z
	.object({ ...base, id: z.coerce.number().int().positive() })
	.superRefine(requirePaymentWhenDelivered);

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
	amount: z.coerce.number().positive('Amount must be greater than 0.'),
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