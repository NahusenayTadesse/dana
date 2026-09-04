import { z } from 'zod/v4';

/**
 * Revoking expires a link now rather than deleting the row — the record that a
 * link was issued for an order is worth keeping, and `payment_links.used_at`
 * is what the settlement path reads.
 */
export const revokeLink = z.object({ id: z.coerce.number().int().positive() });
