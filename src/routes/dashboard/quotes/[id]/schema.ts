import { z } from 'zod/v4';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);
const optionalId = z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable());
const optionalNum = z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable());

const basis = z.enum(['quantity', 'length', 'width', 'thickness', 'color', 'weight', 'area']);

const lineFields = {
	orderId: z.coerce.number().int().positive(),
	productId: z.coerce.number().int().positive('Select a product.'),
	variantId: optionalId, // suggested catalog variant, not authoritative

	basis,
	unitPrice: z.coerce
		.number('Unit price is required')
		.nonnegative('Price cannot be negative.')
		.max(99_999_999.99, 'Price is too large.'), // order_items.price is decimal(10,2)
	priceIncludesVat: z.boolean().default(false),

	quantity: optionalId,
	length: optionalNum,
	lengthUnit: z.enum(['mm', 'm', 'ft']).default('m'),
	thickness: optionalNum,
	thicknessUnit: z.enum(['mm', 'gauge']).default('mm'),
	width: optionalNum,
	widthUnit: z.enum(['mm', 'cm', 'm', 'in', 'ft']).default('mm'),
	weight: optionalNum,
	weightUnit: z.enum(['kg', 'ton']).default('kg'),
	colorId: optionalId
};

export const addLine = z.object(lineFields);
export const updateLine = z.object({ id: z.coerce.number().int().positive(), ...lineFields });
export const deleteLine = z.object({ id: z.coerce.number().int().positive() });

export const saveOffer = z.object({
	orderId: z.coerce.number().int().positive(),
	// decimal(5,2) column: 1000 used to overflow it into a 500. The combined
	// sales + promo discount is capped below 100% on the server.
	discountPercentage: z.preprocess(
		emptyToNull,
		z.coerce.number().min(0, 'Discount cannot be negative.').lt(100, 'Discount must be below 100%.').nullable()
	),
	promoCodeId: optionalId,
	paymentTerms: z.string().max(255).optional().nullable(),
	validityDays: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
	advancePaymentPercentage: z.coerce.number().min(0).max(100).default(100)
});

export const sendOffer = z.object({
	priceOfferId: z.coerce.number().int().positive(),
	subject: z.string().min(1, 'Subject is required'),
	message: z.string().min(1, 'Message is required')
});

export const decideOrder = z.object({
	orderId: z.coerce.number().int().positive()
});

export type AddLine = z.infer<typeof addLine>;
export type UpdateLine = z.infer<typeof updateLine>;
export type DeleteLine = z.infer<typeof deleteLine>;
export type SaveOffer = z.infer<typeof saveOffer>;
export type SendOffer = z.infer<typeof sendOffer>;
export type DecideOrder = z.infer<typeof decideOrder>;
