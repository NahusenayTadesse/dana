import { z } from 'zod/v4';

// Email is optional in the UI (and nullable in the table), so an empty field
// must pass validation instead of blocking the save.
export const add = z.object({
	name: z.string().trim().min(1, 'Name is required').max(50),
	phone: z.string().trim().min(10, 'Phone is required').max(15),
	email: z.email().max(100).optional().or(z.literal('')),
	description: z.string().trim().max(255).optional(),

	status: z.boolean('Status is required').default(true)
});
