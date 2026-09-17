import { eq } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { customers, orders, quoteRequests } from '$lib/server/db/schema';
import type { DbLike } from '$lib/server/stock';

/**
 * Everything the quote builder does downstream of "Start Order" is addressed to
 * the ORDER's customer row: `sendQuotePaymentLink` reads the email and phone off
 * it, and `/pay/[token]` refuses to render without it (Chapa needs a real email
 * to bill against). But the order was created with `customerId: quote.customerId`
 * and nothing checked that it was actually set.
 *
 * A quote request whose `customer_id` is null therefore produced an order staff
 * could price but never send: "Send Offer" failed with "order #N is missing
 * customer, transaction, or price offer data", and no action available anywhere
 * in the dashboard could fix it. The contact details were never missing — the
 * customer typed them into the quote form, and they sit on the quote_requests
 * row the page is already displaying.
 *
 * So resolve them into a real customers row instead of dead-ending. Matching an
 * existing customer by email first is what the public quote form does, and
 * keeps a returning buyer on one record.
 */
export type QuoteCustomerResult =
	| { customerId: number; error?: undefined }
	| { customerId?: undefined; error: string };

/**
 * Ensures the quote request, and the order built from it, both point at a
 * customers row — creating one from the quote's own contact details if needed.
 *
 * Safe to call repeatedly: it only writes what is missing. Pass the caller's
 * transaction so the customer it creates rolls back with the order.
 */
export async function ensureQuoteCustomer(
	quoteRequestId: number,
	tx: DbLike = db
): Promise<QuoteCustomerResult> {
	const quote = await tx
		.select()
		.from(quoteRequests)
		.where(eq(quoteRequests.id, quoteRequestId))
		.then((rows) => rows[0]);

	if (!quote) return { error: 'Quote request not found.' };

	let customerId = quote.customerId ?? null;

	if (customerId) {
		// The link can be stale — a customer deleted since the quote came in
		// would leave an id pointing at nothing, and every send would fail on it.
		const exists = await tx
			.select({ id: customers.id })
			.from(customers)
			.where(eq(customers.id, customerId))
			.then((rows) => rows[0]);
		if (!exists) customerId = null;
	}

	if (!customerId) {
		const email = quote.email?.trim();
		if (!email) {
			// customers.email is NOT NULL and Chapa bills against an address, so
			// there is genuinely nothing to create here. Say which detail is
			// missing rather than reporting a generic "missing customer".
			return {
				error:
					'This quote request has no email address on file, so no customer record can be created for it. Add an email to the quote before sending a priced offer.'
			};
		}

		const existing = await tx
			.select({ id: customers.id })
			.from(customers)
			.where(eq(customers.email, email))
			.limit(1)
			.then((rows) => rows[0]);

		if (existing) {
			customerId = existing.id;
		} else {
			const [inserted] = await tx
				.insert(customers)
				.values({
					name: quote.name,
					email,
					phone: quote.phone ?? null,
					type: quote.companyName ? 'company' : 'individual'
				})
				.$returningId();
			customerId = inserted.id;
		}

		await tx
			.update(quoteRequests)
			.set({ customerId })
			.where(eq(quoteRequests.id, quoteRequestId));
	}

	// The order carries its own copy of the link; an order started before the
	// customer existed still has a null one.
	if (quote.orderId) {
		const order = await tx
			.select({ id: orders.id, customerId: orders.customerId })
			.from(orders)
			.where(eq(orders.id, quote.orderId))
			.then((rows) => rows[0]);

		if (order && order.customerId !== customerId) {
			await tx.update(orders).set({ customerId }).where(eq(orders.id, order.id));
		}
	}

	return { customerId };
}
