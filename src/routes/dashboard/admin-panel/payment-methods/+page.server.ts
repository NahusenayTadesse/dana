import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { paymentMethod as schema, editPaymentMethod as editSchema } from './schema';
import { db } from '$lib/server/db';
import { paymentMethods, user } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import { isDuplicateEntry } from '$lib/server/dbErrors';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(schema));
	const editForm = await superValidate(zod4(editSchema));

	const allPaymentMethods = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			isActive: paymentMethods.isActive,
			createdBy: user.name,
			createdById: paymentMethods.createdBy
		})
		.from(paymentMethods)
		.leftJoin(user, eq(user.id, paymentMethods.createdBy));

	return {
		form,
		editForm,
		allPaymentMethods
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' }, { status: 400 });
		}

		const { name } = form.data;

		try {
			await db.insert(paymentMethods).values({
				name,
				createdBy: locals.user?.id
			});

			return message(form, { type: 'success', text: 'Payment Method Successfully Created' });
		} catch (err) {
			if (isDuplicateEntry(err)) {
				setError(form, 'name', 'Payment Method already exists.');
				return message(
					form,
					{ type: 'error', text: 'Payment Method is already taken. Please choose another one.' },
					{ status: 400 }
				);
			}
			console.error('Error adding payment method:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not add the payment method. Please try again.' },
				{ status: 500 }
			);
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editSchema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' }, { status: 400 });
		}

		const { id, name, isActive } = form.data;

		try {
			const existing = await db
				.select({ id: paymentMethods.id })
				.from(paymentMethods)
				.where(eq(paymentMethods.id, id))
				.then((rows) => rows[0]);

			if (!existing) {
				return message(
					form,
					{ type: 'error', text: 'This payment method no longer exists.' },
					{ status: 404 }
				);
			}

			await db
				.update(paymentMethods)
				.set({ name, isActive, updatedBy: locals?.user?.id })
				.where(eq(paymentMethods.id, id));
			return message(form, { type: 'success', text: 'Payment Method Successfully Updated' });
		} catch (err) {
			if (isDuplicateEntry(err)) {
				setError(form, 'name', 'Payment Method already exists.');
				return message(
					form,
					{ type: 'error', text: 'Payment Method is already taken. Please choose another one.' },
					{ status: 400 }
				);
			}
			console.error('Error updating payment method:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not update the payment method. Please try again.' },
				{ status: 500 }
			);
		}
	}
};
