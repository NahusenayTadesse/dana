import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { thicknesses as department } from '$lib/server/db/schema';
import { isDuplicateEntry, describeDbError } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const allData = await db.select().from(department);

	return {
		form,
		editForm,
		allData
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { value, unit, isActive, label } = form.data;

		try {
			await db.insert(department).values({
				value,
				unit,
				isActive,
				// An emptied label is stored as NULL, not ''.
				label: label || null
			});

			return message(form, { type: 'success', text: 'Thickness Successfully Added' });
		} catch (err) {
			if (isDuplicateEntry(err)) {
				setError(form, 'value', 'Thickness value and unit already exist.');
				setError(form, 'unit', 'Thickness value and unit already exist.');
				return message(
					form,
					{ type: 'error', text: 'Thickness value and unit already exist. Please choose another one.' },
					{ status: 400 }
				);
			}
			console.error('thickness add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add the thickness.') },
				{ status: 500 }
			);
		}
	},
	edit: async ({ request }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { id, value, unit, isActive, label } = form.data;

		try {
			const [result] = await db
				.update(department)
				.set({
					value,
					unit,
					isActive,
					label: label || null
				})
				.where(eq(department.id, id));

			if (!result.affectedRows) {
				return message(
					form,
					{ type: 'error', text: 'That thickness no longer exists.' },
					{ status: 404 }
				);
			}

			return message(form, { type: 'success', text: 'Thickness Successfully Updated' });
		} catch (err) {
			if (isDuplicateEntry(err)) {
				setError(form, 'value', 'Thickness value and unit already exist.');
				setError(form, 'unit', 'Thickness value and unit already exist.');
				return message(
					form,
					{ type: 'error', text: 'Thickness value and unit are already taken. Please choose another one.' },
					{ status: 400 }
				);
			}
			console.error('thickness edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not update the thickness.') },
				{ status: 500 }
			);
		}
	}
};
