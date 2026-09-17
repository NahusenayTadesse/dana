import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { createRoleSchema as schema } from './schema';
import { db } from '$lib/server/db';
import { roles } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types.js';
import { isDuplicateEntry } from '$lib/server/dbErrors';
import { redirect } from 'sveltekit-flash-message/server';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(schema));

	return {
		form
	};
};

export const actions: Actions = {
	add: async ({ request, cookies }) => {
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, description } = form.data;

		let roleId: number;
		try {
			const [created] = await db.insert(roles).values({ name, description }).$returningId();
			roleId = created.id;
		} catch (err) {
			if (isDuplicateEntry(err)) return setError(form, 'name', 'Role Name already exists.');

			console.error('Error adding role:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not add the role. Please try again.' },
				{ status: 500 }
			);
		}

		// A new role has no permissions; its page is where they're set.
		redirect(
			303,
			`/dashboard/admin-panel/roles/${roleId}`,
			{ type: 'success', message: 'Role added. Now choose what it can do.' },
			cookies
		);
	}
} satisfies Actions;
