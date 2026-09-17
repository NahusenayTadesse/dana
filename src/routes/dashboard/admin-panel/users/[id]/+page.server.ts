import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { editUserSchema as schema, userPermissionsSchema } from './schema';

import { db } from '$lib/server/db';
import { roles, user, session } from '$lib/server/db/schema';
import { eq, and, sql, count } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { fail } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';
import { error } from '@sveltejs/kit';
import {
	catalogKeys,
	changedKeys,
	getAccess,
	getRoleGrants,
	getUserGrants,
	replaceUserGrants,
	ungrantable
} from '$lib/server/permissions';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '$lib/permissions';

// The Admin role is the super-admin role (see SUPER_ADMIN_ROLE in $lib/permissions).
const ADMIN_ROLE = SUPER_ADMIN_ROLE;

async function roleNameOf(roleId: number | null): Promise<string | null> {
	if (!roleId) return null;
	return db
		.select({ name: roles.name })
		.from(roles)
		.where(eq(roles.id, roleId))
		.then((rows) => rows[0]?.name ?? null);
}

async function countAdmins(): Promise<number> {
	return db
		.select({ n: count() })
		.from(user)
		.innerJoin(roles, eq(user.roleId, roles.id))
		.where(eq(roles.name, ADMIN_ROLE))
		.then((rows) => rows[0]?.n ?? 0);
}

/**
 * Every row outside the user's own auth data that still points at them —
 * linked customers, quote replies, and the created_by / updated_by audit
 * columns. Read from the live foreign keys so a new table can't be missed.
 * Cascading references (sessions, accounts, special permissions) belong to the
 * user and go with them, so they don't count.
 */
async function userReferences(userId: string): Promise<{ table: string; count: number }[]> {
	const [fkRows] = (await db.execute(sql`
		SELECT k.TABLE_NAME AS tableName, k.COLUMN_NAME AS columnName
		FROM information_schema.KEY_COLUMN_USAGE k
		JOIN information_schema.REFERENTIAL_CONSTRAINTS r
			ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
		WHERE k.REFERENCED_TABLE_SCHEMA = DATABASE()
			AND k.REFERENCED_TABLE_NAME = 'user'
			AND r.DELETE_RULE <> 'CASCADE'
	`)) as unknown as [{ tableName: string; columnName: string }[]];

	const totals = new Map<string, number>();
	for (const { tableName, columnName } of fkRows) {
		const [rows] = (await db.execute(
			sql`SELECT COUNT(*) AS n FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(columnName)} = ${userId}`
		)) as unknown as [{ n: number | string }[]];
		const n = Number(rows[0]?.n ?? 0);
		if (n > 0) totals.set(tableName, (totals.get(tableName) ?? 0) + n);
	}

	return [...totals].map(([table, n]) => ({ table: table.replace(/_/g, ' '), count: n }));
}

export const load: PageServerLoad = async ({ params, locals }) => {
	const { id } = params;

	const form = await superValidate(zod4(schema));

	const singleUser = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			roleId: user.roleId,
			role: roles.name,
			createdAt: user.createdAt,
			updatedAt: user.updatedAt
		})
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, id))
		.then((rows) => rows[0]);

	if (!singleUser) {
		error(404, { message: 'User not found' });
	}

	const roleList = await db
		.select({
			value: roles.id,
			name: roles.name
		})
		.from(roles);

	const access = await getAccess(singleUser.id);
	const permissionsForm = await superValidate(
		{ permissions: await getUserGrants(singleUser.id) },
		zod4(userPermissionsSchema),
		{ id: 'user-permissions', errors: false }
	);

	return {
		singleUser,
		id,
		form,
		roleList,
		permissionsForm,
		isSuperAdmin: access.superAdmin,
		rolePermissions: access.rolePermissions,
		lockedPermissions: ungrantable(
			locals.access,
			PERMISSIONS.map((p) => p.key)
		)
	};
};

// import { saveUploadedFile } from '$lib/server/upload';

export const actions: Actions = {
	editUser: async ({ request, cookies, locals, params }) => {
		const form = await superValidate(request, zod4(schema));

		const { id } = params;

		if (!form.valid) {
			// Stay on the same page and set a flash message
			setFlash({ type: 'error', message: 'Please check your form data.' }, cookies);
			return fail(400, { form });
		}

		const { name, email, role } = form.data;

		try {
			const existingUser = await db
				.select()
				.from(user)
				.where(eq(user.email, email))
				.then((res) => res[0]);

			if (existingUser) {
				if (existingUser.id !== id) {
					setError(form, 'email', 'User with this email already exists, change your email.');
					return message(
						form,
						{
							type: 'error',
							text: 'User with this email already exists, change your email.'
						},
						{ status: 400 }
					);
				}
			}

			const target = await db
				.select({ roleId: user.roleId })
				.from(user)
				.where(eq(user.id, id))
				.then((rows) => rows[0]);

			if (!target) {
				return message(form, { type: 'error', text: 'This user no longer exists.' }, { status: 404 });
			}

			const newRoleName = await roleNameOf(role);
			if (!newRoleName) {
				setError(form, 'role', 'Pick a role that exists.');
				return message(form, { type: 'error', text: 'Pick a role that exists.' }, { status: 400 });
			}

			// Only a super admin may change an Admin, or hand someone a role that
			// carries permissions the editor doesn't hold (e.g. the Admin role).
			if (!locals.access?.superAdmin) {
				const targetIsAdmin = (await roleNameOf(target.roleId)) === ADMIN_ROLE;
				const roleChanged = target.roleId !== role;
				if (
					targetIsAdmin ||
					(roleChanged &&
						(newRoleName === ADMIN_ROLE ||
							ungrantable(locals.access, await getRoleGrants(role)).length > 0))
				) {
					setError(form, 'role', 'You can only assign roles whose permissions you hold yourself.');
					return message(
						form,
						{
							type: 'error',
							text: targetIsAdmin
								? 'Only an Admin can change another Admin.'
								: 'That role has permissions you don’t hold, so you can’t assign it.'
						},
						{ status: 403 }
					);
				}
			}

			// Nobody may lock the dashboard: not by demoting themselves, and not by
			// demoting the last remaining Admin.
			const wasAdmin = (await roleNameOf(target.roleId)) === ADMIN_ROLE;
			if (wasAdmin && newRoleName !== ADMIN_ROLE) {
				if (id === locals.user?.id) {
					return message(
						form,
						{ type: 'error', text: 'You can’t remove your own Admin role. Ask another Admin.' },
						{ status: 400 }
					);
				}
				if ((await countAdmins()) <= 1) {
					return message(
						form,
						{
							type: 'error',
							text: 'This is the last Admin. Give another user the Admin role first.'
						},
						{ status: 400 }
					);
				}
			}

			await db
				.update(user)
				.set({
					name,
					email,
					roleId: role
				})
				.where(eq(user.id, id));

			await db.delete(session).where(eq(session.userId, id));

			// Stay on the same page and set a flash message
			setFlash({ type: 'success', message: 'User Updated Successuflly Added' }, cookies);
			return message(form, { type: 'success', text: 'User Updated Successfully' });
		} catch (err) {
			console.error('Error updating user:', err);
			return message(
				form,
				{ type: 'error', text: 'User update failed. Please try again.' },
				{ status: 500 }
			);
		}
	},
	delete: async ({ cookies, params, locals }) => {
		const { id } = params;

		try {
			if (!id) {
				setFlash({ type: 'error', message: 'Unexpected Error: User ID not provided' }, cookies);
				return fail(400);
			}

			if (id === locals.user?.id) {
				setFlash({ type: 'error', message: 'You can’t delete your own account.' }, cookies);
				return fail(400);
			}

			const target = await db
				.select({ roleId: user.roleId })
				.from(user)
				.where(eq(user.id, id))
				.then((rows) => rows[0]);

			if (!target) {
				setFlash({ type: 'error', message: 'This user no longer exists.' }, cookies);
				return fail(404);
			}

			if ((await roleNameOf(target.roleId)) === ADMIN_ROLE && !locals.access?.superAdmin) {
				setFlash({ type: 'error', message: 'Only an Admin can delete another Admin.' }, cookies);
				return fail(403);
			}

			if ((await roleNameOf(target.roleId)) === ADMIN_ROLE && (await countAdmins()) <= 1) {
				setFlash(
					{ type: 'error', message: 'This is the last Admin, so it can’t be deleted.' },
					cookies
				);
				return fail(400);
			}

			// The user table has no active flag to fall back on, so a referenced user
			// is refused rather than deleted — deleting would break the linked
			// customer / quote replies, or silently blank the audit trail.
			const references = await userReferences(id);
			if (references.length) {
				const list = references.map((r) => `${r.count} ${r.table}`).join(', ');
				setFlash(
					{
						type: 'error',
						message: `This user can’t be deleted because other records still point to them (${list}). Change their role instead to remove their access.`
					},
					cookies
				);
				return fail(400);
			}

			await db.delete(user).where(eq(user.id, id));

			setFlash({ type: 'success', message: 'User Deleted Successfully!' }, cookies);
		} catch (err) {
			console.error('Error deleting user:', err);
			setFlash({ type: 'error', message: 'Could not delete the user. Please try again.' }, cookies);
			return fail(500);
		}
	},

	editPermissions: async ({ request, params, locals }) => {
		const { id } = params;
		const form = await superValidate(request, zod4(userPermissionsSchema), {
			id: 'user-permissions'
		});
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid permission list.' }, { status: 400 });
		}

		const target = await db
			.select({ id: user.id, roleId: user.roleId })
			.from(user)
			.where(eq(user.id, id))
			.then((rows) => rows[0]);
		if (!target) error(404, 'User not found');

		if ((await roleNameOf(target.roleId)) === ADMIN_ROLE) {
			return message(
				form,
				{ type: 'error', text: 'Admins already have full access; special permissions don’t apply.' },
				{ status: 400 }
			);
		}

		const next = catalogKeys(form.data.permissions);
		const blocked = ungrantable(locals.access, changedKeys(await getUserGrants(id), next));
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
			await replaceUserGrants(id, next, locals.user?.id);
			form.data.permissions = next;
			return message(form, {
				type: 'success',
				text: next.length
					? `Saved — ${next.length} special permission${next.length === 1 ? '' : 's'}.`
					: 'Saved — no special permissions; the role decides.'
			});
		} catch (err) {
			console.error('Error saving user permissions:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not save the permissions. Please try again.' },
				{ status: 500 }
			);
		}
	}
};
