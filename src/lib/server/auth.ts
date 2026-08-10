import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';
import { customerResetPasswordTemplate, sendEmail } from '$lib/server/email';
import { admin } from "better-auth/plugins"


export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,

	database: drizzleAdapter(db, { provider: 'mysql' }),
	emailAndPassword: {
		enabled: true,
		revokeSessionsOnPasswordReset: true,

		sendResetPassword: async ({ user, url }) => {
			const template = customerResetPasswordTemplate(url);

			// An unguarded await here surfaced as a generic better-auth failure
			// with no indication of what went wrong, leaving the user unsure
			// whether a reset email was coming at all.
			try {
				await sendEmail(user.email, template.subject, template.html);
			} catch (err) {
				console.error('Failed to send password reset email:', err);
				throw new Error('We could not send the reset email. Please try again in a moment.');
			}
		},

		onPasswordReset: async () => {
			// Deliberately does not log the email address — this fires on every
			// reset and was writing user PII into stdout logs.
			console.log('A user password was reset.');
		}
	},
	plugins: [
		admin(),
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
