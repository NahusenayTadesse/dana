import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc, sql } from 'drizzle-orm';

import { markRead, deleteQuote, replySchema } from './schema.js';
import { db } from '$lib/server/db';
import { quoteRequests, quoteReplies, customers, orders, orderItems, transactions } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types.js';
import { sendEmail, quoteReplyTemplate, quoteReplySms, sendSmsToEthPhone } from '$lib/server/email';

// This is a lightweight index — customer, contact, a rough sense of what's
// being asked for, and the order's confirmation state. The actual multi-line
// price-offer builder lives on the detail page ([id]) since it needs real
// estate a table row can't give it.
export const load: PageServerLoad = async () => {
	const readForm = await superValidate(zod4(markRead));
	const deleteForm = await superValidate(zod4(deleteQuote));
	const replyForm = await superValidate(zod4(replySchema));

	const itemCounts = db
		.select({
			orderId: orderItems.orderId,
			count: sql<number>`COUNT(*)`.mapWith(Number).as('count')
		})
		.from(orderItems)
		.groupBy(orderItems.orderId)
		.as('item_counts');

	const allQuotesRaw = await db
		.select({
			id: quoteRequests.id,
			name: quoteRequests.name,
			email: quoteRequests.email,
			phone: quoteRequests.phone,
			whatsapp: quoteRequests.whatsapp,
			type: customers.type,
			companyName: quoteRequests.companyName,
			message: quoteRequests.message,
			status: quoteRequests.status,
			seen: quoteRequests.seen,
			orderId: quoteRequests.orderId,
			orderRequestStatus: orders.requestStatus,
			itemCount: sql<number>`COALESCE(${itemCounts.count}, 0)`.mapWith(Number),
			createdAt: quoteRequests.createdAt
		})
		.from(quoteRequests)
		.leftJoin(customers, eq(customers.id, quoteRequests.customerId))
		.leftJoin(orders, eq(orders.id, quoteRequests.orderId))
		.leftJoin(itemCounts, eq(itemCounts.orderId, quoteRequests.orderId))
		// Archived quotes (see `delete`) stay in the database for their order.
		.where(eq(quoteRequests.isActive, true))
		.orderBy(desc(quoteRequests.createdAt));

	const allReplies = await db.select().from(quoteReplies).orderBy(desc(quoteReplies.createdAt));

	const repliesByQuote = new Map<number, typeof allReplies>();
	for (const reply of allReplies) {
		const list = repliesByQuote.get(reply.quoteRequestId) ?? [];
		list.push(reply);
		repliesByQuote.set(reply.quoteRequestId, list);
	}

	const allQuotes = allQuotesRaw.map((q) => ({
		...q,
		replies: repliesByQuote.get(q.id) ?? []
	}));

	return { readForm, deleteForm, replyForm, allQuotes };
};

export const actions: Actions = {
	read: async ({ request }) => {
		const form = await superValidate(request, zod4(markRead));
		if (!form.valid) return fail(400, { form });

		try {
			await db.update(quoteRequests).set({ seen: true }).where(eq(quoteRequests.id, form.data.id));
			return message(form, { type: 'success', text: 'Marked as read.' });
		} catch (err) {
			console.error('Mark quote read failed:', err);
			return message(form, { type: 'error', text: 'Error marking as read.' }, { status: 500 });
		}
	},

	delete: async ({ request }) => {
		const form = await superValidate(request, zod4(deleteQuote));
		if (!form.valid) return fail(400, { form });

		const quoteId = form.data.id;

		try {
			const outcome = await db.transaction(async (tx) => {
				const quote = await tx
					.select({ id: quoteRequests.id, orderId: quoteRequests.orderId })
					.from(quoteRequests)
					.where(eq(quoteRequests.id, quoteId))
					.for('update')
					.then((rows) => rows[0]);
				if (!quote) return 'missing' as const;

				if (quote.orderId) {
					const order = await tx
						.select({
							id: orders.id,
							status: orders.status,
							requestStatus: orders.requestStatus,
							transactionId: orders.transactionId
						})
						.from(orders)
						.where(eq(orders.id, quote.orderId))
						.then((rows) => rows[0]);

					const txn = order?.transactionId
						? await tx
								.select({ amountPaid: transactions.amountPaid, txnRef: transactions.txnRef })
								.from(transactions)
								.where(eq(transactions.id, order.transactionId))
								.then((rows) => rows[0])
						: undefined;

					if (order) {
						// An order that went ahead, took money, or has a checkout in
						// flight is real business history: keep it (and the quote it came
						// from) and just take the quote off this list.
						const inUse =
							order.requestStatus === 'approved' ||
							order.status === 'delivered' ||
							Number(txn?.amountPaid ?? 0) > 0 ||
							!!txn?.txnRef;
						if (inUse) {
							await tx.update(quoteRequests).set({ isActive: false }).where(eq(quoteRequests.id, quoteId));
							return { archivedFor: order.id } as const;
						}

						// Otherwise the order only existed to price this quote. Deleting the
						// quote used to leave it behind as an orphaned pending order,
						// counted in the sidebar badge forever. Offers, payment links and
						// adjustments cascade; replies and the quote lose the link.
						await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
						await tx.delete(orders).where(eq(orders.id, order.id));
						if (order.transactionId) {
							await tx.delete(transactions).where(eq(transactions.id, order.transactionId));
						}
					}
				}

				await tx.delete(quoteRequests).where(eq(quoteRequests.id, quoteId));
				return 'deleted' as const;
			});

			if (outcome === 'missing') {
				return message(form, { type: 'error', text: 'Quote request not found.' }, { status: 404 });
			}
			if (outcome === 'deleted') {
				return message(form, { type: 'success', text: 'Quote request deleted.' });
			}
			return message(form, {
				type: 'success',
				text: `Quote request archived. Its order #${outcome.archivedFor} is approved or has payments, so it was kept on the Orders page.`
			});
		} catch (err) {
			console.error('Delete quote failed:', err);
			return message(form, { type: 'error', text: 'Error deleting quote request.' }, { status: 500 });
		}
	},

	// Plain correspondence only — no pricing here anymore.
	reply: async ({ request }) => {
		const form = await superValidate(request, zod4(replySchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		const { quoteRequestId, subject, message: emailMessage } = form.data;

		const quoteReq = await db
			.select()
			.from(quoteRequests)
			.where(eq(quoteRequests.id, quoteRequestId))
			.then((rows) => rows[0]);

		if (!quoteReq) {
			return message(form, { type: 'error', text: 'Quote request not found.' }, { status: 404 });
		}

		// Send first, record second. The reply row and the `contacted` status used
		// to be committed before the email was attempted, so a failed send left a
		// logged "reply" the customer never received — and the error staff saw
		// gave no hint that the record had already been written.
		try {
			if (quoteReq.email) {
				await sendEmail(
					quoteReq.email,
					subject,
					quoteReplyTemplate(quoteReq.name, emailMessage).html,
					quoteReq.phone ?? undefined,
					quoteReplySms(quoteReq.name, emailMessage)
				);
			} else if (quoteReq.phone) {
				// No email on file — the SMS is the whole reply. sendSmsToEthPhone
				// never throws; it reports failure (bad number, gateway error) in
				// its result, which used to be ignored and reported as "Reply sent."
				const sms = await sendSmsToEthPhone(quoteReq.phone, quoteReplySms(quoteReq.name, emailMessage));
				if (!sms?.success) {
					console.error('Reply SMS failed:', sms);
					return message(
						form,
						{
							type: 'error',
							text: `The SMS to ${quoteReq.phone} could not be sent and there is no email on file — nothing was recorded. Check the number and try again.`
						},
						{ status: 502 }
					);
				}
			} else {
				return message(
					form,
					{ type: 'error', text: 'This quote request has no email or phone number to reply to.' },
					{ status: 400 }
				);
			}
		} catch (err) {
			// Never the raw error: SMTP errors carry server and account details.
			console.error('Reply error:', err);
			return message(
				form,
				{
					type: 'error',
					text: 'The reply email could not be sent — nothing was recorded. Check the email settings and press Send again to retry.'
				},
				{ status: 500 }
			);
		}

		try {
			await db.insert(quoteReplies).values({ quoteRequestId, subject, message: emailMessage });

			if (quoteReq.status === 'new') {
				await db.update(quoteRequests).set({ status: 'contacted' }).where(eq(quoteRequests.id, quoteRequestId));
			}
		} catch (err) {
			// The reply is already with the customer — don't invite a resend.
			console.error('Reply sent but recording it failed:', err);
		}

		return message(form, { type: 'success', text: 'Reply sent.' });
	}
};
