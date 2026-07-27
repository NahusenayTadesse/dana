import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { lengths as department } from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';

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
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { value, unit, isActive, label } = form.data;

		try {
			await db.transaction(async (tx) => {
				await tx.insert(department).values({
					value,
					unit,
					isActive,
					label
				});
			});

			return message(form, { type: 'success', text: 'Length Successfully Added' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') {
				setError(form, 'value', 'Length value or unit already exists.');
				setError(form, 'unit', 'Length value  or unit already exists.');
			}
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Length value and unit already exists. Please choose another one.'
						: err.message
			});
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return fail(400, { form });
		}

		const { id, value, unit, isActive, label } = form.data;

		try {
			await db
				.update(department)
				.set({
					value,
					unit,
					isActive,
					label
				})
				.where(eq(department.id, Number(id)));
			return message(form, { type: 'success', text: 'Length Successfully Updated' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') return;
			setError(form, 'value', 'Length value or unit already exists.');
			setError(form, 'unit', 'Length value  or unit already exists.');
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Length value or unit is already taken. Please choose another one.'
						: err.message
			});
		}
	}
};
