// Chapa webhook — the PRIMARY path by which a payment becomes settled.
//
// Before this existed, confirmation depended entirely on the customer's browser
// returning to /pay/[token]/complete. If they closed the tab after paying on
// Chapa, the money was taken and the order was never marked paid.
//
// The signature check here is a filter, not the decision. Whether an order is
// actually paid is decided by settlePaymentAttempt(), which asks Chapa
// server-to-server and checks the amount — so a forged body cannot settle
// anything even if it somehow got past this.

import { json, text, type RequestHandler } from '@sveltejs/kit';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { settlePaymentAttempt } from '$lib/server/paymentSettlement';

/**
 * Chapa signs the raw request body with HMAC-SHA256 under the webhook secret
 * and sends the hex digest in `Chapa-Signature` (older integrations use
 * `x-chapa-signature`). Both are accepted.
 */
function isSignatureValid(rawBody: string, signature: string | null, secret: string): boolean {
	if (!signature) return false;

	const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

	const given = Buffer.from(signature.trim());
	const want = Buffer.from(expected);

	// timingSafeEqual throws on length mismatch, so check that first.
	return given.length === want.length && timingSafeEqual(given, want);
}

export const POST: RequestHandler = async ({ request }) => {
	const secret = env.CHAPA_WEBHOOK_SECRET;

	if (!secret) {
		console.error('CHAPA_WEBHOOK_SECRET is not configured — rejecting webhook.');
		return json({ error: 'Webhook not configured.' }, { status: 500 });
	}

	// Must read the RAW body: re-serialising parsed JSON would not reproduce the
	// exact bytes Chapa signed.
	const rawBody = await request.text();

	const signature =
		request.headers.get('chapa-signature') ?? request.headers.get('x-chapa-signature');

	if (!isSignatureValid(rawBody, signature, secret)) {
		console.warn('Rejected Chapa webhook with a bad or missing signature.');
		return json({ error: 'Invalid signature.' }, { status: 401 });
	}

	let payload: { tx_ref?: string; trx_ref?: string; reference?: string };
	try {
		payload = JSON.parse(rawBody);
	} catch {
		return json({ error: 'Malformed payload.' }, { status: 400 });
	}

	// Chapa has used a few names for this field across API versions.
	const txRef = payload.tx_ref ?? payload.trx_ref ?? payload.reference;

	if (!txRef) {
		return json({ error: 'Payload carried no transaction reference.' }, { status: 400 });
	}

	try {
		const outcome = await settlePaymentAttempt(txRef);

		// Always 200 on a well-formed, authentic webhook we processed — a non-2xx
		// makes Chapa retry, and "pending" here means we genuinely could not
		// confirm it yet, which a retry legitimately should revisit.
		if (outcome.status === 'pending') {
			return json({ received: true, settled: false, reason: outcome.reason }, { status: 202 });
		}

		return json({ received: true, settled: outcome.status === 'paid' });
	} catch (err) {
		console.error('Chapa webhook processing failed:', err);
		// 500 so Chapa retries — this is our fault, not a bad payment.
		return json({ error: 'Could not process webhook.' }, { status: 500 });
	}
};

/** Some Chapa dashboard flows probe the URL with a GET before saving it. */
export const GET: RequestHandler = async () => text('ok');
