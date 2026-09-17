import { z } from 'zod/v4';

export const createRoleSchema = z.object({
	name: z
		.string()
		.min(1, 'Role name is required')
		.max(32, 'Role name must be at most 32 characters'),

	description: z
		.string()
		.min(1, 'Role description is required')
		.max(255, 'Role description must be at most 255 characters')

	// permissions: z.array(z.string().min(1)).nonempty('At least one permission must be selected')
});
