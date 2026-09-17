import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, eq, ne, sql } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { tags as department } from '$lib/server/db/schema';
import { describeDbError } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

/**
 * `tags.name` has no unique index, so uniqueness is enforced here: trimmed and
 * case-insensitive, ignoring the row being edited.
 */
async function nameTaken(name: string, exceptId?: number) {
	const sameName = sql`lower(trim(${department.name})) = ${name.trim().toLowerCase()}`;
	const [hit] = await db
		.select({ id: department.id })
		.from(department)
		.where(exceptId ? and(sameName, ne(department.id, exceptId)) : sameName)
		.limit(1);
	return !!hit;
}

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const allData = await db
		.select({
			id: department.id,
			name: department.name
		})
		.from(department);

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

		const { name } = form.data;

		try {
			if (await nameTaken(name)) {
				setError(form, 'name', 'Tag already exists.');
				return message(
					form,
					{ type: 'error', text: 'A tag with that name already exists.' },
					{ status: 400 }
				);
			}

			await db.insert(department).values({ name });

			return message(form, { type: 'success', text: 'Tag Successfully Added' });
		} catch (err) {
			console.error('tag add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add the tag.') },
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

		const { id, name } = form.data;

		try {
			if (await nameTaken(name, id)) {
				setError(form, 'name', 'Tag name already exists.');
				return message(
					form,
					{ type: 'error', text: 'Tag name is already taken. Please choose another one.' },
					{ status: 400 }
				);
			}

			const [result] = await db.update(department).set({ name }).where(eq(department.id, id));

			if (!result.affectedRows) {
				return message(
					form,
					{ type: 'error', text: 'That tag no longer exists.' },
					{ status: 404 }
				);
			}

			return message(form, { type: 'success', text: 'Tag Successfully Updated' });
		} catch (err) {
			console.error('tag edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not update the tag.') },
				{ status: 500 }
			);
		}
	}
};
