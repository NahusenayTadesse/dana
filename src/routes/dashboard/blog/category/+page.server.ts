import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
import { add, edit, deleteService } from './schema';
import { db } from '$lib/server/db';
import { blogCategories as paymentMethods } from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));
	const deleteForm = await superValidate(zod4(deleteService));

	const allData = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			description: paymentMethods.description
		})
		.from(paymentMethods);

	return {
		form,
		editForm,
		deleteForm,
		allData
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, description } = form.data;

		try {
			await db.insert(paymentMethods).values({
				name,
				description
			});

			return message(form, { type: 'success', text: 'Category Successfully Created' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') setError(form, 'name', 'Category already exists.');
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Service is already taken. Please choose another one.'
						: err.message
			});
		}
	},
	edit: async ({ request }) => {
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, name, description } = form.data;

		try {
			await db.update(paymentMethods).set({ name, description }).where(eq(paymentMethods.id, id));
			return message(form, { type: 'success', text: 'Category Successfully Updated' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') return setError(form, 'name', 'Category already exists.');
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Service  is already taken. Please choose another one.'
						: err.message
			});
		}
	},
	delete: async ({ request }) => {
		const form = await superValidate(request, zod4(deleteService));

		if (!form.valid) {
			return fail(400, { form });
		}

		const { id } = form.data;

		try {
			await db.delete(paymentMethods).where(eq(paymentMethods.id, id));
			return message(form, { type: 'success', text: 'Category Successfully Deleted' });
		} catch (err: any) {
			return message(
				form,
				{
					type: 'error',
					text: 'Error while deleting category.'
				},
				{ status: 500 }
			);
		}
	}
};
