import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { editRoleSchema as schema } from './schema';

import { db } from '$lib/server/db';
import { roles, user, rolePermissions } from '$lib/server/db/schema';
import { eq, countDistinct, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const { id } = params;

	const form = await superValidate(zod4(schema));

	const singleUser = await db
		.select({
			id: roles.id,
			name: roles.name,
			description: roles.description,
			userCount: countDistinct(user.id),
			permissionsCount: countDistinct(rolePermissions.id)
		})
		.from(roles)
		.leftJoin(user, and(eq(user.roleId, roles.id)))
		.leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
		.groupBy(roles.id)
		.where(eq(roles.id, Number(id)))
		.then((rows) => rows[0]);

	if (!singleUser) {
		return error(404, { message: 'Role not found' });
	}

	const userList = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name
		})
		.from(user)
		.where(eq(user.roleId, Number(id)));

	return {
		singleUser,
		id,
		form,
		userList
	};
};

// The dashboard gate matches the role *name* "Admin", so renaming or deleting
// that role would lock every administrator out.
const PROTECTED_ROLE = 'Admin';

export const actions: Actions = {
	edit: async ({ request, params }) => {
		const id = Number(params.id);
		const form = await superValidate(request, zod4(schema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' });
		}

		const { name, description } = form.data;

		const current = await db
			.select({ name: roles.name })
			.from(roles)
			.where(eq(roles.id, id))
			.then((rows) => rows[0]);

		if (!current) error(404, 'Role not found');

		if (current.name === PROTECTED_ROLE && name !== PROTECTED_ROLE) {
			return setError(form, 'name', 'The Admin role cannot be renamed.');
		}

		try {
			await db.update(roles).set({ name, description }).where(eq(roles.id, id));
			return message(form, { type: 'success', text: 'Role updated successfully.' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') return setError(form, 'name', 'Role name already exists.');
			return message(form, { type: 'error', text: err.message });
		}
	},

	delete: async ({ params, cookies }) => {
		const id = Number(params.id);

		const role = await db
			.select({ name: roles.name, userCount: countDistinct(user.id) })
			.from(roles)
			.leftJoin(user, eq(user.roleId, roles.id))
			.where(eq(roles.id, id))
			.groupBy(roles.id)
			.then((rows) => rows[0]);

		if (!role) error(404, 'Role not found');

		if (role.name === PROTECTED_ROLE || role.userCount > 0) {
			setFlash(
				{
					type: 'error',
					message:
						role.name === PROTECTED_ROLE
							? 'The Admin role cannot be deleted.'
							: 'Cannot delete a role that still has users.'
				},
				cookies
			);
			return fail(400);
		}

		try {
			await db.delete(roles).where(eq(roles.id, id));
			setFlash({ type: 'success', message: 'Role Deleted Successfully!' }, cookies);
		} catch (err: any) {
			setFlash({ type: 'error', message: `Unexpected Error: ${err?.message}` }, cookies);
			return fail(400);
		}
	}
};
