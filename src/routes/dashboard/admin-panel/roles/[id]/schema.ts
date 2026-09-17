import { z } from 'zod/v4';

export const editRoleSchema = z.object({
	name: z
		.string()
		.min(1, 'Role name is required')
		.max(32, 'Role name must be at most 32 characters'),

	description: z
		.string()
		.min(1, 'Role description is required')
		.max(255, 'Role description must be at most 255 characters')
});

export const rolePermissionsSchema = z.object({
	permissions: z.array(z.string().max(50)).max(500)
});
