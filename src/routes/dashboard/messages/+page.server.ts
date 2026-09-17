import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { desc, eq } from 'drizzle-orm';

import { deleteMessage, markRead } from './schema.js';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	// Distinct ids on the server too, so the two identical schemas never share one.
	const readForm = await superValidate(zod4(markRead), { id: 'message-read' });
	const deleteForm = await superValidate(zod4(deleteMessage), { id: 'message-delete' });

	const allMessages = await db
		.select({
			id: contactMessages.id,
			name: contactMessages.name,
			email: contactMessages.email,
			phone: contactMessages.phone,
			subject: contactMessages.subject,
			isRead: contactMessages.seen,
			message: contactMessages.message,
			address: contactMessages.address,
			submittedAt: contactMessages.createdAt
		})
		.from(contactMessages)
		.orderBy(desc(contactMessages.createdAt));

	return {
		readForm,
		deleteForm,
		allMessages
	};
};

export const actions: Actions = {
	read: async ({ request }) => {
		const form = await superValidate(request, zod4(markRead));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await db.update(contactMessages).set({ seen: true }).where(eq(contactMessages.id, form.data.id));
			return message(form, { type: 'success', text: 'Message Successfully Marked as Read' });
		} catch (err) {
			console.error('Mark message read failed:', err);
			return message(form, { type: 'error', text: 'Error while marking message as read.' }, { status: 500 });
		}
	},
	delete: async ({ request }) => {
		const form = await superValidate(request, zod4(deleteMessage));

		if (!form.valid) {
			return fail(400, { form });
		}

		try {
			await db.delete(contactMessages).where(eq(contactMessages.id, form.data.id));
			return message(form, { type: 'success', text: 'Message Successfully Deleted' });
		} catch (err) {
			console.error('Delete message failed:', err);
			return message(form, { type: 'error', text: 'Error while deleting message.' }, { status: 500 });
		}
	}
};
