import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc, isNull, and, gt } from 'drizzle-orm';

import { revokeLink } from './schema';
import { db } from '$lib/server/db';
import { paymentLinks, orders, customers } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import type { LinkRow } from './types';

const stamp = (value: Date | null) =>
	value ? value.toISOString().slice(0, 16).replace('T', ' ') : '';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: paymentLinks.id,
			orderId: paymentLinks.orderId,
			customerName: customers.name,
			orderStatus: orders.status,
			createdAt: paymentLinks.createdAt,
			expiresAt: paymentLinks.expiresAt,
			usedAt: paymentLinks.usedAt
		})
		.from(paymentLinks)
		.leftJoin(orders, eq(orders.id, paymentLinks.orderId))
		.leftJoin(customers, eq(customers.id, orders.customerId))
		.orderBy(desc(paymentLinks.createdAt));

	const now = new Date();

	// The token itself is never shown. Only its sha256 digest is stored, so the
	// link cannot be reconstructed here — which is the point of hashing it.
	const allData: LinkRow[] = rows.map((row) => ({
		id: row.id,
		orderId: row.orderId,
		customerName: row.customerName,
		orderStatus: row.orderStatus,
		createdAt: stamp(row.createdAt),
		expiresAt: stamp(row.expiresAt),
		usedAt: row.usedAt ? stamp(row.usedAt) : null,
		state: row.usedAt ? 'used' : row.expiresAt < now ? 'expired' : 'live'
	}));

	return { allData, revokeForm: await superValidate(zod4(revokeLink)) };
};

export const actions: Actions = {
	revoke: async ({ request }) => {
		const form = await superValidate(request, zod4(revokeLink));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Nothing to revoke' }, { status: 400 });
		}

		try {
			// Only an unused link can be revoked — expiring one that has already
			// been paid would rewrite the record of a completed payment.
			const now = new Date();
			const result = await db
				.update(paymentLinks)
				.set({ expiresAt: new Date(now.getTime() - 1000) })
				.where(
					and(
						eq(paymentLinks.id, form.data.id),
						isNull(paymentLinks.usedAt),
						gt(paymentLinks.expiresAt, now)
					)
				);

			// mysql2 resolves writes to [ResultSetHeader, fields]. Nothing matched
			// means the link doesn't exist, was paid, or had already expired —
			// reporting "revoked" there told staff a live link was dead when
			// nothing had changed.
			const header = Array.isArray(result) ? result[0] : result;
			if (!(header as { affectedRows?: number })?.affectedRows) {
				return message(
					form,
					{ type: 'error', text: 'This link was already used, expired or revoked — nothing changed.' },
					{ status: 409 }
				);
			}

			return message(form, { type: 'success', text: 'Link revoked' });
		} catch (err) {
			console.error('payment link revoke failed', err);
			return message(form, { type: 'error', text: 'Could not revoke this link.' }, { status: 500 });
		}
	}
};
