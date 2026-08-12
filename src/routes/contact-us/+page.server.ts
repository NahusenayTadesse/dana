import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import {
	sendEmail,
	customerContactTemplate,
	adminContactTemplate,
	contactReceivedSms
} from '$lib/server/email';
import { SMTP_USER } from '$env/static/private';
import { contactSchema } from './schema';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(contactSchema));

	return {
		form
	};
};

export const actions: Actions = {
	contact: async ({ request }) => {
		const form = await superValidate(request, zod4(contactSchema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, phoneNumber, email, subject, contactMessage } = form.data;

		try {
			await db
				.insert(contactMessages)
				.values({ name, phone: phoneNumber, email, subject, message: contactMessage });

			// Deliberately not awaited — the message is already saved, and the
			// sender shouldn't wait on SMTP to see their confirmation. The
			// `.catch` is what makes that safe: without it a mail outage became
			// an unhandled rejection that escaped this try block and took the
			// whole Node process down, one contact-form submission at a time.
			const adminMail = adminContactTemplate(form.data);
			sendEmail(SMTP_USER, adminMail.subject, adminMail.html).catch((err) =>
				console.error('Email Error (Admin contact):', err)
			);

			const userMail = customerContactTemplate(name, subject);
			sendEmail(
				email,
				userMail.subject,
				userMail.html,
				phoneNumber,
				contactReceivedSms(name, subject)
			).catch((err) => console.error('Email/SMS Error (Customer contact):', err));

			return message(form, { type: 'success', text: 'Message Successfully Sent!' });
		} catch (err) {
			return message(form, {
				type: 'error',
				text: 'Error Adding Messages: ' + err?.message
			});
		}
	}
};
