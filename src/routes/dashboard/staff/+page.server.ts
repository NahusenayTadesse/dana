import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, asc } from 'drizzle-orm';

import { addStaff, editStaff } from './schema';
import { db } from '$lib/server/db';
import { staff } from '$lib/server/db/schema';
import { describeDbError } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const allData = await db
		.select({
			id: staff.id,
			name: staff.name,
			role: staff.role,
			phone: staff.phone,
			isActive: staff.isActive
		})
		.from(staff)
		.orderBy(asc(staff.name));

	return {
		allData,
		form: await superValidate(zod4(addStaff)),
		editForm: await superValidate(zod4(editStaff))
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addStaff));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		try {
			await db.insert(staff).values({
				name: form.data.name,
				role: form.data.role || null,
				phone: form.data.phone || null,
				isActive: form.data.isActive,
				createdBy: locals?.user?.id
			});
			return message(form, { type: 'success', text: `${form.data.name} added` });
		} catch (err) {
			console.error('staff add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add this person.') },
				{ status: 500 }
			);
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editStaff));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		try {
			const [result] = await db
				.update(staff)
				.set({
					name: form.data.name,
					role: form.data.role || null,
					phone: form.data.phone || null,
					isActive: form.data.isActive,
					updatedBy: locals?.user?.id
				})
				.where(eq(staff.id, form.data.id));
			if (result.affectedRows === 0) {
				return message(
					form,
					{ type: 'error', text: 'This person no longer exists. Reload the page.' },
					{ status: 404 }
				);
			}
			return message(form, { type: 'success', text: `${form.data.name} updated` });
		} catch (err) {
			console.error('staff edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save this person.') },
				{ status: 500 }
			);
		}
	}
};
