
import { CHAPA_SECRET_KEY } from '$env/static/private';

const CHAPA_BASE = 'https://api.chapa.co/v1';

type InitializeParams = {
	amount: number;
	email: string;
	firstName: string;
	lastName: string;
	phoneNumber?: string;
	txRef: string;
	callbackUrl: string;
	returnUrl: string;
	title?: string;
	description?: string;
};

// Helper function to sanitize text for Chapa
function sanitizeChapaText(text: string): string {
	// Remove any character that's not a letter, number, space, dot, hyphen, or underscore
	return text.replace(/[^a-zA-Z0-9\s\.\-_]/g, ' ').trim();
}

export async function initializeChapaTransaction(params: InitializeParams) {
	try {
		// Sanitize title and description
		const title = params.title ? sanitizeChapaText(params.title) : 'Order Payment';
		const description = params.description ? sanitizeChapaText(params.description) : 'Payment for your order';
		
		// Make sure they're not empty after sanitization
		const finalTitle = title || 'Order Payment';
		const finalDescription = description || 'Payment for your order';
		
		const res = await fetch(`${CHAPA_BASE}/transaction/initialize`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				amount: params.amount,
				currency: 'ETB',
				email: params.email,
				first_name: params.firstName,
				last_name: params.lastName,
				phone_number: params.phoneNumber,
				tx_ref: params.txRef,
				callback_url: params.callbackUrl,
				return_url: params.returnUrl,
				customization: {
					title: finalTitle,
					description: finalDescription
				}
			})
		});

		const data = await res.json();

		if (!res.ok || data.status !== 'success') {
			let errorMessage = 'Failed to initialize Chapa transaction';
			
			if (data.message) {
				if (typeof data.message === 'string') {
					errorMessage = data.message;
				} else if (typeof data.message === 'object') {
					// Format validation errors nicely
					const errors = Object.entries(data.message)
						.map(([field, messages]) => `${field}: ${(messages as string[]).join(', ')}`)
						.join('; ');
					errorMessage = `Validation failed: ${errors}`;
				}
			}
			
			console.error('Chapa Error:', errorMessage);
			throw new Error(errorMessage);
		}

		return data.data.checkout_url as string;
		
	} catch (error) {
		if (error instanceof Error) {
			throw error;
		}
		throw new Error('An unexpected error occurred while initializing payment');
	}
}

/** The ONLY authoritative source of truth for whether a payment succeeded. */
export async function verifyChapaTransaction(txRef: string) {
	const res = await fetch(`${CHAPA_BASE}/transaction/verify/${encodeURIComponent(txRef)}`, {
		headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
	});

	const data = await res.json();
	return data; // data.status === 'success' && data.data.status === 'success' → paid
}

// Webhook signature verification lives in the route that needs it —
// src/routes/api/chapa/webhook/+server.ts — because it has to hash the RAW
// request body, which only the handler has access to. As the note there says,
// that check is a first line of defence against noise hitting the endpoint; it
// is NOT what decides whether an order is paid. That decision only ever comes
// from verifyChapaTransaction() above, via settlePaymentAttempt().
