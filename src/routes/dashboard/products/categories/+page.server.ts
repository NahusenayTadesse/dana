import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { productCategories as department } from '$lib/server/db/schema';
import { isDuplicateEntry, describeDbError } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const allData = await db
		.select({
			id: department.id,
			name: department.name,
			description: department.description,
			status: department.isActive
		})
		.from(department);

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
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { name, description, status } = form.data;

		try {
			await db.insert(department).values({
				name,
				description,
				isActive: status,
				createdBy: locals?.user?.id
			});

			return message(form, { type: 'success', text: 'Category Successfully Added' });
		} catch (err) {
			if (isDuplicateEntry(err)) {
				setError(form, 'name', 'Category already exists.');
				return message(
					form,
					{ type: 'error', text: 'A category with that name already exists.' },
					{ status: 400 }
				);
			}
			console.error('category add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add the category.') },
				{ status: 500 }
			);
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { id, name, description, status } = form.data;

		try {
			const [result] = await db
				.update(department)
				.set({
					name,
					description,
					isActive: status,
					updatedBy: locals?.user?.id
				})
				.where(eq(department.id, id));

			if (!result.affectedRows) {
				return message(
					form,
					{ type: 'error', text: 'That category no longer exists.' },
					{ status: 404 }
				);
			}

			return message(form, { type: 'success', text: 'Category Successfully Updated' });
		} catch (err) {
			if (isDuplicateEntry(err)) {
				setError(form, 'name', 'Category name already exists.');
				return message(
					form,
					{ type: 'error', text: 'Category name is already taken. Please choose another one.' },
					{ status: 400 }
				);
			}
			console.error('category edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not update the category.') },
				{ status: 500 }
			);
		}
	}
};
