import { z } from 'zod/v4';

export const editUserSchema = z.object({
	email: z.email('Email is required'),
	name: z.string('Name is required').min(2).max(100),
	role: z.coerce.number('Pick a role').int().positive('Pick a role')
});

export const userPermissionsSchema = z.object({
	permissions: z.array(z.string().max(50)).max(500)
});
