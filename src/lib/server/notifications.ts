import { getOrderDetails } from '$lib/server/orders';
import { createPaymentLink, buildPaymentLinkUrl } from '$lib/server/paymentLinks';
import {
	sendEmail,
	quotePaymentLinkTemplate,
	paymentConfirmedTemplate,
	adminPaymentConfirmedTemplate
} from '$lib/server/email';
import { SMTP_USER as USER } from '$env/static/private';

export async function sendQuotePaymentLink(orderId: number, origin: string) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer || !details.transaction) {
		throw new Error(`Cannot send payment link — order #${orderId} is missing customer or transaction data.`);
	}

	const rawToken = await createPaymentLink(orderId);
	const payUrl = buildPaymentLinkUrl(origin, rawToken);
	const total = Number(details.transaction.amount);

	const { subject, html } = quotePaymentLinkTemplate(orderId, details.items, total, payUrl);
	await sendEmail(details.customer.email, subject, html, details.customer.phone ?? undefined);
}

export async function sendPaymentConfirmation(orderId: number) {
	const details = await getOrderDetails(orderId);
	if (!details?.customer || !details.transaction) {
		console.error(`Cannot send payment confirmation — order #${orderId} is missing customer or transaction data.`);
		return;
	}

	const total = Number(details.transaction.amount);

	const customerTemplate = paymentConfirmedTemplate(orderId, details.items, total);
	await sendEmail(details.customer.email, customerTemplate.subject, customerTemplate.html, details.customer.phone ?? undefined);

	const adminTemplate = adminPaymentConfirmedTemplate(orderId, details.items, total);
	await sendEmail(USER, adminTemplate.subject, adminTemplate.html);
}