import { getOrderDetails } from '$lib/server/orders';
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
	adminOrderCancelledTemplate
} from '$lib/server/email';
import { SMTP_USER as USER } from '$env/static/private';

export async function sendQuotePaymentLink(orderId: number, origin: string) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer || !details.transaction || !details.offer) {
		throw new Error(
			`Cannot send payment link — order #${orderId} is missing customer, transaction, or price offer data.`
		);
	}

	const rawToken = await createPaymentLink(orderId);
	const payUrl = buildPaymentLinkUrl(origin, rawToken);
	const { offer, items } = details;

	// Customer — full detail in the email, a concise total/VAT/link in the SMS.
	const { subject, html } = quotePaymentLinkTemplate(orderId, items, offer, payUrl);
	await sendEmail(
		details.customer.email,
		subject,
		html,
		details.customer.phone ?? undefined,
		quotePaymentLinkSms(orderId, offer, payUrl)
	);

	// Staff — always notified when a priced quote goes out, same full detail.
	const adminTemplate = adminQuotePaymentLinkTemplate(orderId, items, offer);
	await sendEmail(USER, adminTemplate.subject, adminTemplate.html);
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

	const customerTemplate = paymentConfirmedTemplate(orderId, items, offer, payAmount, isAdvance);
	await sendEmail(
		details.customer.email,
		customerTemplate.subject,
		customerTemplate.html,
		details.customer.phone ?? undefined,
		paymentConfirmedSms(orderId, offer, payAmount, isAdvance)
	);

	const adminTemplate = adminPaymentConfirmedTemplate(orderId, items, offer, payAmount, isAdvance);
	await sendEmail(USER, adminTemplate.subject, adminTemplate.html);
}

/**
 * Generates a fresh payment link for whatever's still owed on an order and
 * sends it to the customer — callable at any time (delivered, mid-negotiation,
 * whenever), not just right after a quote is priced. No-ops with an error if
 * the order is already fully paid or has no price offer to bill against.
 */
export async function sendBalancePaymentLink(orderId: number, origin: string) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer || !details.transaction || !details.offer) {
		throw new Error(
			`Cannot send balance payment link — order #${orderId} is missing customer, transaction, or price offer data.`
		);
	}

	const { transaction, customer } = details;
	// Approved adjustments (see orderAdjustments) shift what's actually owed —
	// this is always the true current total, not just the accepted offer's.
	const adjusted = await getAdjustedOrderTotals(orderId);
	if (!adjusted) {
		throw new Error(`Cannot send balance payment link — order #${orderId} has no price offer.`);
	}
	const total = adjusted.total;
	// transaction.amount tracks "amount charged on the most recent successful
	// attempt" — for a paid-off transaction that's the running amount paid so far.
	const amountPaid = transaction.paymentStatus === 'paid' || transaction.paymentStatus === 'partially_paid'
		? Number(transaction.amount)
		: 0;
	const remainingBalance = Math.round(total - amountPaid);

	if (remainingBalance <= 0) {
		throw new Error(`Order #${orderId} has no remaining balance — nothing to request.`);
	}

	const rawToken = await createPaymentLink(orderId);
	const payUrl = buildPaymentLinkUrl(origin, rawToken);

	const customerTemplate = balancePaymentLinkTemplate(orderId, adjusted, amountPaid, remainingBalance, payUrl);
	await sendEmail(
		customer.email,
		customerTemplate.subject,
		customerTemplate.html,
		customer.phone ?? undefined,
		balancePaymentLinkSms(orderId, remainingBalance, payUrl)
	);

	const adminTemplate = adminBalancePaymentLinkTemplate(orderId, amountPaid, remainingBalance);
	await sendEmail(USER, adminTemplate.subject, adminTemplate.html);
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
	if (!details?.customer || !adjusted) {
		console.error(`Cannot send adjustment notice — order #${orderId} is missing customer or price offer data.`);
		return;
	}

	const customerTemplate = orderAdjustmentAppliedTemplate(orderId, adjustment, adjusted.total);
	await sendEmail(
		details.customer.email,
		customerTemplate.subject,
		customerTemplate.html,
		details.customer.phone ?? undefined,
		`Order #${orderId} adjusted: ${adjustment.type === 'addition' ? '+' : '-'}${adjustment.amount.toLocaleString()} ETB. New total: ${adjusted.total.toLocaleString()} ETB.`
	);

	const adminTemplate = adminOrderAdjustmentTemplate(orderId, adjustment, adjusted.total);
	await sendEmail(USER, adminTemplate.subject, adminTemplate.html);
}

/** Customer submitted an adjustment request — staff needs to review it. */
export async function sendAdjustmentRequestedNotice(orderId: number, customerName: string, reason: string, requestedAmount: number) {
	const template = adjustmentRequestedTemplate(orderId, customerName, reason, requestedAmount);
	await sendEmail(USER, template.subject, template.html);
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
		details.customer.phone ?? undefined,
		`Order #${orderId}: your adjustment request was ${approved ? 'approved' : 'declined'}.`
	);
}

/** Customer rejected the price offer on the magic-link page — staff-only heads-up. */
export async function sendOfferRejectedNotice(orderId: number, reason?: string | null) {
	const template = adminOfferRejectedTemplate(orderId, reason);
	await sendEmail(USER, template.subject, template.html);
}

/** Customer cancelled the order from the magic-link page — staff-only heads-up. */
export async function sendOrderCancelledNotice(orderId: number, reason?: string | null) {
	const template = adminOrderCancelledTemplate(orderId, reason);
	await sendEmail(USER, template.subject, template.html);
}
