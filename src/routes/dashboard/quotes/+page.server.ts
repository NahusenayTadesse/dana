import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc } from 'drizzle-orm';

import { markRead, deleteQuote, replySchema } from './schema.js';
import { db } from '$lib/server/db';
import {
	quoteRequests,
	quoteReplies,
	products,
	productVariants,
	productCategories,
	colors,
	widths,
	thicknesses,
	customers,
	orders,
	transactions,
	orderItems
} from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types.js';
import { sendEmail, quoteReplyTemplate } from '$lib/server/email';
import { sendQuotePaymentLink } from '$lib/server/notifications';

export const load: PageServerLoad = async () => {
	const readForm = await superValidate(zod4(markRead));
	const deleteForm = await superValidate(zod4(deleteQuote));
	const replyForm = await superValidate(zod4(replySchema));

	const allQuotesRaw = await db
		.select({
			id: quoteRequests.id,
			name: quoteRequests.name,
			email: quoteRequests.email,
			phone: quoteRequests.phone,
			whatsapp: quoteRequests.whatsapp,
			type: customers.type,
			companyName: quoteRequests.companyName,
			quantityEstimate: quoteRequests.quantityEstimate,
			message: quoteRequests.message,
			status: quoteRequests.status,
			seen: quoteRequests.seen,
			orderId: quoteRequests.orderId,
			createdAt: quoteRequests.createdAt,
			productId: quoteRequests.productId,
			productName: products.name,
			categoryName: productCategories.name,
			variantId: quoteRequests.variantId,
			colorName: colors.name,
			colorHex: colors.hexValue,
			widthValue: widths.value,
			widthUnit: widths.unit,
			widthLabel: widths.label,
			thicknessValue: thicknesses.value,
			thicknessUnit: thicknesses.unit
		})
		.from(quoteRequests)
		.leftJoin(products, eq(products.id, quoteRequests.productId))
		.leftJoin(productCategories, eq(productCategories.id, quoteRequests.categoryId))
		.leftJoin(productVariants, eq(productVariants.id, quoteRequests.variantId))
		.leftJoin(customers, eq(customers.id, quoteRequests.customerId))
		.leftJoin(colors, eq(colors.id, productVariants.colorId))
		.leftJoin(widths, eq(widths.id, productVariants.widthId))
		.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
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

	reply: async ({ request, url }) => {
		const form = await superValidate(request, zod4(replySchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		const { quoteRequestId, subject, message: emailMessage, quotedUnitPrice, quotedQuantity } = form.data;
		const isPricedReply = quotedUnitPrice !== undefined && quotedQuantity !== undefined;

		const quoteReq = await db
			.select()
			.from(quoteRequests)
			.where(eq(quoteRequests.id, quoteRequestId))
			.then((rows) => rows[0]);

		if (!quoteReq) {
			return message(form, { type: 'error', text: 'Quote request not found.' }, { status: 404 });
		}

		if (isPricedReply && !quoteReq.productId) {
			return message(
				form,
				{ type: 'error', text: 'This request has no specific product linked — cannot create an order from it.' },
				{ status: 400 }
			);
		}

		let orderIdForReply: number | undefined = quoteReq.orderId ?? undefined;

		try {
			if (isPricedReply) {
				await db.transaction(async (tx) => {
					let customerId = quoteReq.customerId;
					if (!customerId) {
						const existing = await tx
							.select({ id: customers.id })
							.from(customers)
							.where(eq(customers.email, quoteReq.email!))
							.then((rows) => rows[0]);
						if (!existing) {
							throw new Error('No customer record found for this request — cannot create an order.');
						}
						customerId = existing.id;
					}

					const total = quotedUnitPrice! * quotedQuantity!;

					if (orderIdForReply) {
						// Revising an already-quoted request: update the existing order/transaction
						// in place instead of creating a duplicate.
						const existingOrder = await tx
							.select()
							.from(orders)
							.where(eq(orders.id, orderIdForReply))
							.then((rows) => rows[0]);

						if (existingOrder?.transactionId) {
							await tx
								.update(transactions)
								.set({ amount: String(total) })
								.where(eq(transactions.id, existingOrder.transactionId));

							await tx
								.update(orderItems)
								.set({ quantity: quotedQuantity!, price: String(quotedUnitPrice!) })
								.where(eq(orderItems.orderId, orderIdForReply));
						}
					} else {
						const [transaction] = await tx
							.insert(transactions)
							.values({ amount: String(total), paymentStatus: 'pending' })
							.$returningId();

						const [order] = await tx
							.insert(orders)
							.values({ customerId, status: 'pending', transactionId: transaction.id })
							.$returningId();

						await tx.insert(orderItems).values({
							orderId: order.id,
							productId: quoteReq.productId!,
							variantId: quoteReq.variantId ?? null,
							quantity: quotedQuantity!,
							price: String(quotedUnitPrice!),
							// legacy NOT NULL column from the old schema — kept populated so
							// inserts don't fail; not used by anything going forward.
							amount: String(quotedQuantity!)
						});

						orderIdForReply = order.id;

						await tx
							.update(quoteRequests)
							.set({ orderId: order.id, status: 'quoted' })
							.where(eq(quoteRequests.id, quoteRequestId));
					}
				});
			} else if (quoteReq.status === 'new') {
				await db.update(quoteRequests).set({ status: 'contacted' }).where(eq(quoteRequests.id, quoteRequestId));
			}

			await db.insert(quoteReplies).values({
				quoteRequestId,
				subject,
				message: emailMessage,
				quotedUnitPrice: isPricedReply ? String(quotedUnitPrice) : null,
				quotedQuantity: isPricedReply ? quotedQuantity : null,
				orderId: orderIdForReply ?? null
			});
		} catch (err) {
			console.error('Reply error:', err);
			return message(
				form,
				{ type: 'error', text: 'Error processing reply: ' + (err instanceof Error ? err.message : String(err)) },
				{ status: 500 }
			);
		}

		try {
			if (isPricedReply && orderIdForReply) {
				await sendQuotePaymentLink(orderIdForReply, url.origin);
			} else {
				await sendEmail(
					quoteReq.email!,
					subject,
					quoteReplyTemplate(quoteReq.name, emailMessage).html,
					quoteReq.phone ?? undefined
				);
			}
		} catch (err) {
			console.error('Notification send error:', err);
			return message(form, {
				type: 'error',
				text: 'Reply was saved, but sending the email/SMS failed. Please retry sending.'
			});
		}

		return message(form, {
			type: 'success',
			text: isPricedReply ? 'Priced quote sent to customer.' : 'Reply sent.'
		});
	}
};