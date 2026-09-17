import { z } from 'zod/v4';

const emptyToNull = (v: unknown) => (v === '' || v == null ? null : v);

/** decimal(12,3): nine whole digits, three decimals. */
const MAX_QTY = 999_999_999.999;
const tooBig = 'That is more than can be stored';

const fields = {
	name: z.string('A name is required').trim().min(2, 'Too short').max(150),
	supplierId: z.preprocess(emptyToNull, z.coerce.number().int().positive().nullable()),
	unit: z.enum(['kg', 'ton', 'm', 'coil']).default('ton'),
	reorderLevel: z.preprocess(
		emptyToNull,
		z.coerce.number().min(0, 'Cannot be negative').max(MAX_QTY, tooBig).nullable()
	),
	isActive: z.boolean().default(true)
};

// On-hand is only typed in when a material is created. After that it moves
// through production batches, received purchase orders and the edit sheet's
// +/- adjustment — never by overwriting it with whatever the sheet was
// opened with, which lost every movement made in between.
export const addMaterial = z.object({
	...fields,
	quantityOnHand: z.coerce
		.number('Enter a quantity')
		.min(0, 'Cannot be negative')
		.max(MAX_QTY, tooBig)
});

export const editMaterial = z.object({
	id: z.coerce.number().int().positive(),
	...fields,
	/** Added to on-hand (negative takes away). Blank or 0 leaves it alone. */
	adjustBy: z.preprocess(
		emptyToNull,
		z.coerce.number('Enter a number').min(-MAX_QTY, tooBig).max(MAX_QTY, tooBig).nullable()
	)
});

export type EditMaterial = z.infer<typeof editMaterial>;
