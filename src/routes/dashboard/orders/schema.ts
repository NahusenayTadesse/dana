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

export type Add = z.infer<typeof add>;
export type Edit = z.infer<typeof edit>;