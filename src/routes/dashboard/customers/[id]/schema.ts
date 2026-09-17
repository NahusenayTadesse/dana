import { z } from 'zod/v4';

export const edit = z.object({
	name: z
		.string('Name is Required')
		.trim()
		.min(2, 'Name must be at least 2 characters')
		.max(100, 'Name must be at most 100 characters'),
	email: z.email('Email is Required').max(100, 'Email must be at most 100 characters'),
	// Phone and address are nullable in the database (guest and imported
	// customers often have neither), so they are optional here too.
	phone: z.string().trim().max(20, 'Phone must be at most 20 characters').nullable(),
	address: z.string().trim().max(255, 'Address must be at most 255 characters').nullable(),
	status: z.boolean().default(true)
});
export type Edit = z.infer<typeof edit>;
