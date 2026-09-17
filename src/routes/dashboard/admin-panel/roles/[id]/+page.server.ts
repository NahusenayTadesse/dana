import { message, superValidate, setError } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { editRoleSchema as schema, rolePermissionsSchema } from './schema';

import { db } from '$lib/server/db';
import { roles, user, rolePermissions } from '$lib/server/db/schema';
import { eq, countDistinct, and } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';
import { error } from '@sveltejs/kit';
import { parseIdParam } from '$lib/server/params';
import { isDuplicateEntry } from '$lib/server/dbErrors';
import {
	catalogKeys,
	changedKeys,
	getRoleGrants,
	replaceRoleGrants,
	ungrantable
} from '$lib/server/permissions';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '$lib/permissions';

export const load: PageServerLoad = async ({ params, locals }) => {
	const id = parseIdParam(params.id);

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
		.where(eq(roles.id, id))
		.then((rows) => rows[0]);

	if (!singleUser) {
		error(404, { message: 'Role not found' });
	}

	const grants = await getRoleGrants(id);
	const permissionsForm = await superValidate(
		{ permissions: grants },
		zod4(rolePermissionsSchema),
		{ id: 'role-permissions', errors: false }
	);

	const userList = await db
		.select({
			id: user.id,
			email: user.email,
			name: user.name
		})
		.from(user)
		.where(eq(user.roleId, id));

	return {
		singleUser,
		id,
		form,
		userList,
		permissionsForm,
		isSuperAdminRole: singleUser.name === SUPER_ADMIN_ROLE,
		// Keys the current editor can't change — they don't hold them themselves.
		lockedPermissions: ungrantable(
			locals.access,
			PERMISSIONS.map((p) => p.key)
		)
	};
};

// The Admin role is the super-admin role: renaming or deleting it would lock
// every administrator out.
const PROTECTED_ROLE = SUPER_ADMIN_ROLE;

export const actions: Actions = {
	edit: async ({ request, params, locals }) => {
		const id = parseIdParam(params.id);
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

		if (current.name === PROTECTED_ROLE && !locals.access?.superAdmin) {
			return message(
				form,
				{ type: 'error', text: 'Only an Admin can change the Admin role.' },
				{ status: 403 }
			);
		}

		if (current.name === PROTECTED_ROLE && name !== PROTECTED_ROLE) {
			return setError(form, 'name', 'The Admin role cannot be renamed.');
		}

		try {
			await db.update(roles).set({ name, description }).where(eq(roles.id, id));
			return message(form, { type: 'success', text: 'Role updated successfully.' });
		} catch (err) {
			if (isDuplicateEntry(err)) return setError(form, 'name', 'Role name already exists.');
			console.error('Error updating role:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not update the role. Please try again.' },
				{ status: 500 }
			);
		}
	},

	delete: async ({ params, cookies, locals }) => {
		const id = parseIdParam(params.id);

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
			// A role carries permissions; only someone holding all of them may remove it.
			if (ungrantable(locals.access, await getRoleGrants(id)).length > 0) {
				setFlash(
					{
						type: 'error',
						message: 'This role has permissions you don’t hold, so you can’t delete it.'
					},
					cookies
				);
				return fail(403);
			}

			await db.delete(roles).where(eq(roles.id, id));
			setFlash({ type: 'success', message: 'Role Deleted Successfully!' }, cookies);
		} catch (err) {
			console.error('Error deleting role:', err);
			setFlash({ type: 'error', message: 'Could not delete the role. Please try again.' }, cookies);
			return fail(500);
		}
	},

	editPermissions: async ({ request, params, locals }) => {
		const id = parseIdParam(params.id);
		const form = await superValidate(request, zod4(rolePermissionsSchema), {
			id: 'role-permissions'
		});
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid permission list.' }, { status: 400 });
		}

		const role = await db
			.select({ name: roles.name })
			.from(roles)
			.where(eq(roles.id, id))
			.then((rows) => rows[0]);
		if (!role) error(404, 'Role not found');

		if (role.name === PROTECTED_ROLE) {
			return message(
				form,
				{ type: 'error', text: 'The Admin role always has full access; its permissions can’t be changed.' },
				{ status: 400 }
			);
		}

		const next = catalogKeys(form.data.permissions);
		const current = await getRoleGrants(id);
		const blocked = ungrantable(locals.access, changedKeys(current, next));
		if (blocked.length > 0) {
			return message(
				form,
				{
					type: 'error',
					text: `You can only grant or remove permissions you hold yourself (${blocked.slice(0, 5).join(', ')}${blocked.length > 5 ? '…' : ''}).`
				},
				{ status: 403 }
			);
		}

		try {
			await replaceRoleGrants(id, next, locals.user?.id);
			form.data.permissions = next;
			return message(form, {
				type: 'success',
				text: `Saved — ${next.length} permission${next.length === 1 ? '' : 's'} on ${role.name}.`
			});
		} catch (err) {
			console.error('Error saving role permissions:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not save the permissions. Please try again.' },
				{ status: 500 }
			);
		}
	}
};
