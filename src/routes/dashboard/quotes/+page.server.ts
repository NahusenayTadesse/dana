import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc, sql } from 'drizzle-orm';

import { markRead, deleteQuote, replySchema } from './schema.js';
import { db } from '$lib/server/db';
import { quoteRequests, quoteReplies, customers, orders, orderItems } from '$lib/server/db/schema';
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
		} catch {
			return message(form, { type: 'error', text: 'Error marking as read.' }, { status: 500 });
		}
	},

	delete: async ({ request }) => {
		const form = await superValidate(request, zod4(deleteQuote));
		if (!form.valid) return fail(400, { form });

		try {
			await db.delete(quoteRequests).where(eq(quoteRequests.id, form.data.id));
			return message(form, { type: 'success', text: 'Quote request deleted.' });
		} catch {
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
				// No email on file — the SMS is the whole reply.
				await sendSmsToEthPhone(quoteReq.phone, quoteReplySms(quoteReq.name, emailMessage));
			}
		} catch (err) {
			console.error('Reply error:', err);
			return message(
				form,
				{
					type: 'error',
					text:
						'Error sending reply: ' +
						(err instanceof Error ? err.message : String(err)) +
						' — nothing was recorded. Press Send again to retry.'
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
