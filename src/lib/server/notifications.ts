import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { quoteRequests } from '$lib/server/db/schema';
import { getOrderDetails, getOrderTotal } from '$lib/server/orders';
import { getAdjustedOrderTotals } from '$lib/server/orderAdjustments';
import { createPaymentLink, buildPaymentLinkUrl } from '$lib/server/paymentLinks';
import {
	sendEmail,
	quotePaymentLinkTemplate,
	quotePaymentLinkSms,
	adminQuotePaymentLinkTemplate,
	paymentConfirmedTemplate,
	adminPaymentConfirmedTemplate,
	paymentConfirmedSms,
	balancePaymentLinkTemplate,
	balancePaymentLinkSms,
	adminBalancePaymentLinkTemplate,
	orderAdjustmentAppliedTemplate,
	adminOrderAdjustmentTemplate,
	adjustmentRequestedTemplate,
	adjustmentDecisionTemplate,
	adminOfferRejectedTemplate,
	adminOrderCancelledTemplate,
	customerDeliveredTemplate,
	adminDeliveredTemplate,
	orderDeliveredSms
} from '$lib/server/email';
import { SMTP_USER as USER } from '$env/static/private';
import { getSiteSettings } from '$lib/server/siteSettings';
import { vatRateOf } from '$lib/siteSettings';

/**
 * A notification was refused for a reason staff can act on (order cancelled,
 * offer rejected, nothing owed). Its `message` is safe to show in the
 * dashboard; any other error thrown from here is not and must be logged.
 */
export class NotificationError extends Error {}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

type Details = NonNullable<Awaited<ReturnType<typeof getOrderDetails>>>;

/**
 * The number to text. `customers.phone` is optional, but a quote request always
 * carries the phone the customer typed into the form — fall back to it so an
 * offer or balance SMS isn't silently skipped for guests.
 */
async function smsPhoneFor(details: Details): Promise<string | undefined> {
	if (details.customer?.phone) return details.customer.phone;
	const quote = await db
		.select({ phone: quoteRequests.phone })
		.from(quoteRequests)
		.where(eq(quoteRequests.orderId, details.order.id))
		.orderBy(desc(quoteRequests.id))
		.limit(1)
		.then((rows) => rows[0]);
	return quote?.phone || undefined;
}

/**
 * Where staff notifications go. Business Settings can point them at a sales
 * inbox; left blank they fall back to the mailbox the site sends from, which
 * is what happened before the setting existed.
 *
 * Exported because the three notifications the setting's own description names
 * — "new order" and "new quote request" — are raised outside this module (the
 * checkout, quote and contact forms) and were hardcoding SMTP_USER, so setting
 * a sales inbox moved every alert EXCEPT the ones staff actually configured it
 * for. There must be exactly one answer to "where do staff alerts go".
 */
export async function alertsRecipient(): Promise<string> {
	const settings = await getSiteSettings();
	return settings['alerts_recipient_email']?.trim() || USER;
}

/**
 * Sends the customer notification and the staff notification independently.
 *
 * These used to be two sequential awaits, which meant a customer-side failure —
 * a bad address, a transient SMTP error — also silently skipped the staff copy.
 * The team would then have no record that anything had been attempted, on
 * exactly the occasions they most needed one.
 *
 * Rejects if the CUSTOMER leg failed, since that is what callers report on; a
 * staff-side failure is logged instead, so it cannot make a notification the
 * customer did receive look like a failure.
 */
async function notifyBoth(
	label: string,
	customer: () => Promise<unknown>,
	staff: () => Promise<unknown>
) {
	const [customerResult, staffResult] = await Promise.allSettled([customer(), staff()]);

	if (staffResult.status === 'rejected') {
		console.error(`${label}: staff notification failed:`, staffResult.reason);
	}
	if (customerResult.status === 'rejected') {
		console.error(`${label}: customer notification failed:`, customerResult.reason);
		throw customerResult.reason;
	}
}

export async function sendQuotePaymentLink(orderId: number, origin: string) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer || !details.transaction || !details.offer) {
		throw new NotificationError(
			`Cannot send payment link — order #${orderId} is missing customer, transaction, or price offer data.`
		);
	}
	// /pay refuses both of these, so a link sent now would be dead on arrival.
	if (details.order.status === 'cancelled') {
		throw new NotificationError(`Order #${orderId} is cancelled — no payment link was sent.`);
	}
	if (details.offer.status === 'rejected') {
		throw new NotificationError(
			`The customer rejected this offer — save a new revision before sending it again.`
		);
	}

	const rawToken = await createPaymentLink(orderId);
	const payUrl = buildPaymentLinkUrl(origin, rawToken);
	const { offer, items } = details;

	// Customer — full detail in the email, a concise total/VAT/link in the SMS.
	// Staff — always notified when a priced quote goes out, same full detail.
	const vatRate = vatRateOf(await getSiteSettings());
	const { subject, html } = quotePaymentLinkTemplate(orderId, items, offer, payUrl, vatRate);
	const adminTemplate = adminQuotePaymentLinkTemplate(orderId, items, offer, vatRate);
	const phone = await smsPhoneFor(details);

	await notifyBoth(
		`quote payment link (order #${orderId})`,
		() =>
			sendEmail(
				details.customer!.email,
				subject,
				html,
				phone,
				quotePaymentLinkSms(orderId, offer, payUrl)
			),
		async () => sendEmail(await alertsRecipient(), adminTemplate.subject, adminTemplate.html)
	);
}

export async function sendPaymentConfirmation(orderId: number, payAmount: number, isAdvance: boolean) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer || !details.transaction || !details.offer) {
		console.error(
			`Cannot send payment confirmation — order #${orderId} is missing customer, transaction, or price offer data.`
		);
		return;
	}

	const { offer, items } = details;

	const vatRate = vatRateOf(await getSiteSettings());
	const customerTemplate = paymentConfirmedTemplate(orderId, items, offer, payAmount, isAdvance, vatRate);
	const adminTemplate = adminPaymentConfirmedTemplate(orderId, items, offer, payAmount, isAdvance, vatRate);
	const phone = await smsPhoneFor(details);

	await notifyBoth(
		`payment confirmation (order #${orderId})`,
		() =>
			sendEmail(
				details.customer!.email,
				customerTemplate.subject,
				customerTemplate.html,
				phone,
				paymentConfirmedSms(orderId, offer, payAmount, isAdvance)
			),
		async () => sendEmail(await alertsRecipient(), adminTemplate.subject, adminTemplate.html)
	);
}

/**
 * Generates a fresh payment link for whatever's still owed on an order and
 * sends it to the customer — callable at any time (delivered, mid-negotiation,
 * whenever), not just right after a quote is priced. No-ops with an error if
 * the order is already fully paid or has no price offer to bill against.
 */
export async function sendBalancePaymentLink(orderId: number, origin: string) {
	const details = await getOrderDetails(orderId);
	if (!details) throw new NotificationError(`Order #${orderId} was not found.`);
	if (!details.offer) {
		throw new NotificationError(
			`Order #${orderId} has no price offer — balance links only work for orders priced in the quote builder.`
		);
	}
	if (!details.customer || !details.transaction) {
		throw new NotificationError(
			`Cannot send balance payment link — order #${orderId} is missing its customer or payment record. Send the offer from the quote builder first.`
		);
	}
	if (details.order.status === 'cancelled') {
		throw new NotificationError(`Order #${orderId} is cancelled — there is nothing to collect.`);
	}
	if (details.offer.status === 'rejected') {
		throw new NotificationError(
			`The customer rejected the offer on order #${orderId} — send a revised offer instead.`
		);
	}

	const { transaction, customer } = details;
	// Approved adjustments (see orderAdjustments) shift what's actually owed —
	// this is always the true current total, not just the accepted offer's.
	const adjusted = await getAdjustedOrderTotals(orderId);
	if (!adjusted) {
		throw new NotificationError(`Cannot send balance payment link — order #${orderId} has no price offer.`);
	}
	const total = adjusted.total;
	// amountPaid is what has actually been collected. `transaction.amount` is
	// the size of the checkout attempt currently in flight — reading it as
	// "already paid" meant an abandoned balance attempt was quoted back to the
	// customer as money received. Same 2dp rounding as the pay page, so the
	// email and the page charge the same figure (and a sub-1 ETB remainder is
	// still a remainder).
	const amountPaid = Number(transaction.amountPaid);
	const remainingBalance = round2(total - amountPaid);

	if (remainingBalance <= 0) {
		throw new NotificationError(`Order #${orderId} has no remaining balance — nothing to request.`);
	}

	const rawToken = await createPaymentLink(orderId);
	const payUrl = buildPaymentLinkUrl(origin, rawToken);

	const customerTemplate = balancePaymentLinkTemplate(orderId, adjusted, amountPaid, remainingBalance, payUrl);
	const adminTemplate = adminBalancePaymentLinkTemplate(orderId, amountPaid, remainingBalance);
	const phone = await smsPhoneFor(details);

	await notifyBoth(
		`balance payment link (order #${orderId})`,
		() =>
			sendEmail(
				customer.email,
				customerTemplate.subject,
				customerTemplate.html,
				phone,
				balancePaymentLinkSms(orderId, remainingBalance, payUrl)
			),
		async () => sendEmail(await alertsRecipient(), adminTemplate.subject, adminTemplate.html)
	);
}

/**
 * Informational notice that an adjustment was applied — for a deduction
 * (nothing further to collect) or as a heads-up alongside an addition whose
 * actual payment link goes out separately via sendBalancePaymentLink.
 */
export async function sendOrderAdjustmentNotice(
	orderId: number,
	adjustment: { type: 'addition' | 'deduction'; amount: number; reason: string; causedBy: string }
) {
	const details = await getOrderDetails(orderId);
	const adjusted = await getAdjustedOrderTotals(orderId);
	// Throw rather than log-and-return: callers report a rejection as "the
	// customer could not be notified", and returning quietly let the dashboard
	// say "Adjustment applied." when nobody was told anything.
	if (!details?.customer || !adjusted) {
		throw new NotificationError(
			`Cannot send adjustment notice — order #${orderId} is missing customer or price offer data.`
		);
	}

	const customerTemplate = orderAdjustmentAppliedTemplate(orderId, adjustment, adjusted.total);
	const adminTemplate = adminOrderAdjustmentTemplate(orderId, adjustment, adjusted.total);
	const phone = await smsPhoneFor(details);

	await notifyBoth(
		`order adjustment (order #${orderId})`,
		() =>
			sendEmail(
				details.customer!.email,
				customerTemplate.subject,
				customerTemplate.html,
				phone,
				`Order #${orderId} adjusted: ${adjustment.type === 'addition' ? '+' : '-'}${adjustment.amount.toLocaleString()} ETB. New total: ${adjusted.total.toLocaleString()} ETB.`
			),
		async () => sendEmail(await alertsRecipient(), adminTemplate.subject, adminTemplate.html)
	);
}

/** Customer submitted an adjustment request — staff needs to review it. */
export async function sendAdjustmentRequestedNotice(orderId: number, customerName: string, reason: string, requestedAmount: number) {
	const template = adjustmentRequestedTemplate(orderId, customerName, reason, requestedAmount);
	await sendEmail(await alertsRecipient(), template.subject, template.html);
}

/** Staff approved or rejected a customer's adjustment request. */
export async function sendAdjustmentDecisionNotice(orderId: number, approved: boolean, reason?: string | null) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer) return;

	const template = adjustmentDecisionTemplate(orderId, approved, reason);
	await sendEmail(
		details.customer.email,
		template.subject,
		template.html,
		await smsPhoneFor(details),
		`Order #${orderId}: your adjustment request was ${approved ? 'approved' : 'declined'}.`
	);
}

/**
 * The order reached the customer. Fires on the transition into `delivered` and
 * nowhere else — re-saving an already-delivered order must not re-announce it.
 *
 * The total is the order's payable total (getOrderTotal): the adjusted offer
 * for a quoted order, or the lines priced with VAT for an order staff created
 * directly — the same figure recorded as collected on delivery.
 */
export async function sendOrderDeliveredNotice(orderId: number) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer) {
		console.error(`Cannot send delivery notice — order #${orderId} has no customer on file.`);
		return;
	}

	const { total } = await getOrderTotal(orderId);
	const { items } = details;

	const vatRate = vatRateOf(await getSiteSettings());
	const customerTemplate = customerDeliveredTemplate(orderId, items, total, vatRate);
	const adminTemplate = adminDeliveredTemplate(orderId, items, total, vatRate);
	const phone = await smsPhoneFor(details);

	await notifyBoth(
		`delivery notice (order #${orderId})`,
		() =>
			sendEmail(
				details.customer!.email,
				customerTemplate.subject,
				customerTemplate.html,
				phone,
				orderDeliveredSms(orderId, total)
			),
		async () => sendEmail(await alertsRecipient(), adminTemplate.subject, adminTemplate.html)
	);
}

/** Customer rejected the price offer on the magic-link page — staff-only heads-up. */
export async function sendOfferRejectedNotice(orderId: number, reason?: string | null) {
	const template = adminOfferRejectedTemplate(orderId, reason);
	await sendEmail(await alertsRecipient(), template.subject, template.html);
}

/** Customer cancelled the order from the magic-link page — staff-only heads-up. */
export async function sendOrderCancelledNotice(orderId: number, reason?: string | null) {
	const template = adminOrderCancelledTemplate(orderId, reason);
	await sendEmail(await alertsRecipient(), template.subject, template.html);
}
