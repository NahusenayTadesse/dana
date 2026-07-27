import { randomBytes, createHash } from 'node:crypto';
import { db } from '$lib/server/db';
import { paymentLinks } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

const TOKEN_BYTES = 32; // 256 bits — infeasible to guess/brute-force
const EXPIRY_DAYS = 14;

function hashToken(rawToken: string) {
	return createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Creates a new payment link for an already-priced order and returns the RAW
 * token. This is the only moment the raw token exists — embed it directly into
 * the email/SMS link. It is never written to the database or logged.
 */
export async function createPaymentLink(orderId: number): Promise<string> {
	const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
	const tokenHash = hashToken(rawToken);
	const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

	await db.insert(paymentLinks).values({ orderId, tokenHash, expiresAt });

	return rawToken;
}

/**
 * Resolves a raw token from a URL into its payment_links row, or null if the
 * token is unknown, expired, or already used. Safe to call with untrusted input.
 */
export async function resolvePaymentLink(rawToken: string | undefined | null) {
	if (!rawToken || rawToken.length < 20) return null;

	const tokenHash = hashToken(rawToken);

	const link = await db
		.select()
		.from(paymentLinks)
		.where(eq(paymentLinks.tokenHash, tokenHash))
		.then((rows) => rows[0]);

	if (!link) return null;
	if (link.usedAt) return null;
	if (link.expiresAt.getTime() < Date.now()) return null;

	return link;
}

export async function markPaymentLinkUsed(orderId: number) {
	await db.update(paymentLinks).set({ usedAt: new Date() }).where(eq(paymentLinks.orderId, orderId));
}

/** Convenience: build the full URL to email/text to the customer */
export function buildPaymentLinkUrl(origin: string, rawToken: string) {
	return `${origin}/pay/${rawToken}`;
}


export async function findPaymentLinkByToken(rawToken: string | undefined | null) {
	if (!rawToken || rawToken.length < 20) return null;

	const tokenHash = hashToken(rawToken);

	return await db
		.select()
		.from(paymentLinks)
		.where(eq(paymentLinks.tokenHash, tokenHash))
		.then((rows) => rows[0] ?? null);
}