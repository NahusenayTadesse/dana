import { z } from 'zod/v4';

export const add = z.object({
	name: z.string('Name is Required').min(2).max(100),
	phone: z.string('Phone is Required').min(10).max(15),
	email: z.email('Email is Required'),
	password: z.string('Password is required!'),
	tinNo: z.string().min(10).max(10).optional(),
	docs: z.file().max(10000000).optional(),
	type: z.enum(['company', 'individual'], 'Customer type is required').default('individual')

});
