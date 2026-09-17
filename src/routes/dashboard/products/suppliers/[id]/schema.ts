import { z } from 'zod/v4';

// The supplier id comes from the route, never from the form.
export const edit = z.object({
	name: z.string().trim().min(1, 'Name is required').max(50),
	phone: z.string().trim().min(10, 'Phone is required').max(15),
	email: z.email().max(100).optional().or(z.literal('')),
	description: z.string().trim().max(255).optional(),
	status: z.boolean('Status is required').default(true)
});
export type Edit = z.infer<typeof edit>;
