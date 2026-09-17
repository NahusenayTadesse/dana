// Resolving what a signed-in user may do in the dashboard.
//
// Effective permissions = the permissions granted to the user's role (when the
// role is active) + the user's own special permissions. Users on the Admin role
// are super admins and pass every check, so a missing grant can never lock the
// business out of its own dashboard.

import { error } from '@sveltejs/kit';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { permissions, rolePermissions, roles, specialPermissions, user } from '$lib/server/db/schema';
import {
	PERMISSIONS,
	PERMISSION_KEYS,
	SUPER_ADMIN_ROLE,
	type Access,
	type PermissionKey
} from '$lib/permissions';

export type ResolvedAccess = Access & {
	roleId: number | null;
	roleName: string | null;
	/** Permissions granted through the role only (not special permissions). */
	rolePermissions: string[];
};

export async function getAccess(userId: string): Promise<ResolvedAccess> {
	const role = await db
		.select({ id: roles.id, name: roles.name, isActive: roles.isActive })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId))
		.then((rows) => rows[0]);

	const roleActive = !!role?.id && !!role.isActive;
	const superAdmin = roleActive && role?.name === SUPER_ADMIN_ROLE;

	const [fromRole, special] = await Promise.all([
		roleActive
			? db
					.select({ name: permissions.name })
					.from(rolePermissions)
					.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
					.where(and(eq(rolePermissions.roleId, role!.id!), eq(rolePermissions.isActive, true)))
					.then((rows) => rows.map((r) => r.name))
			: Promise.resolve([] as string[]),
		db
			.select({ name: permissions.name })
			.from(specialPermissions)
			.innerJoin(permissions, eq(permissions.id, specialPermissions.permissionId))
			.where(and(eq(specialPermissions.userId, userId), eq(specialPermissions.isActive, true)))
			.then((rows) => rows.map((r) => r.name))
	]);

	return {
		superAdmin,
		permissions: [...new Set([...fromRole, ...special])].sort(),
		rolePermissions: fromRole.sort(),
		roleId: role?.id ?? null,
		roleName: role?.name ?? null
	};
}

/** Whether the user can enter the dashboard at all. */
export function hasDashboardAccess(access: Access): boolean {
	return access.superAdmin || access.permissions.length > 0;
}

export function hasPermission(access: Access | undefined, key: PermissionKey): boolean {
	return !!access && (access.superAdmin || access.permissions.includes(key));
}

/**
 * Throw 403 unless the request's user holds `key`. For checks finer than the
 * route/action rules in hooks (e.g. inside an action that does several things).
 */
export function requirePermission(locals: App.Locals, key: PermissionKey): void {
	if (!hasPermission(locals.access, key)) {
		error(403, 'You don’t have permission to do that.');
	}
}

/**
 * The permissions in `keys` the acting user may NOT hand out or take away. A
 * super admin can change anything; everyone else only what they hold
 * themselves, so editing roles or users can never escalate anyone's access
 * beyond the editor's own. Empty means the change is allowed.
 */
export function ungrantable(access: Access | undefined, keys: Iterable<string>): string[] {
	if (access?.superAdmin) return [];
	const held = new Set(access?.permissions ?? []);
	return [...keys].filter((key) => !held.has(key));
}

/** Keys added or removed between two grant lists. */
export function changedKeys(current: Iterable<string>, next: Iterable<string>): string[] {
	const a = new Set(current);
	const b = new Set(next);
	return [...new Set([...a, ...b])].filter((key) => a.has(key) !== b.has(key));
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Make sure every catalog permission has its row, so saving grants works even
 * before `npm run db:seed:permissions` has been run. Returns name → id.
 */
async function permissionIds(tx: Tx, keys: string[]): Promise<Map<string, number>> {
	if (keys.length > 0) {
		const defs = PERMISSIONS.filter((p) => keys.includes(p.key));
		await tx
			.insert(permissions)
			.values(defs.map((p) => ({ name: p.key, description: `${p.moduleLabel} — ${p.description}`.slice(0, 255) })))
			.onDuplicateKeyUpdate({ set: { name: sql`${permissions.name}` } });
	}
	const rows = keys.length
		? await tx.select({ id: permissions.id, name: permissions.name }).from(permissions).where(inArray(permissions.name, keys))
		: [];
	return new Map(rows.map((r) => [r.name, r.id]));
}

/** Only keys that exist in the catalog, de-duplicated. */
export function catalogKeys(keys: Iterable<string>): string[] {
	return [...new Set(keys)].filter((key) => PERMISSION_KEYS.has(key));
}

export async function getRoleGrants(roleId: number): Promise<string[]> {
	return db
		.select({ name: permissions.name })
		.from(rolePermissions)
		.innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
		.where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.isActive, true)))
		.then((rows) => rows.map((r) => r.name).sort());
}

export async function getUserGrants(userId: string): Promise<string[]> {
	return db
		.select({ name: permissions.name })
		.from(specialPermissions)
		.innerJoin(permissions, eq(permissions.id, specialPermissions.permissionId))
		.where(and(eq(specialPermissions.userId, userId), eq(specialPermissions.isActive, true)))
		.then((rows) => rows.map((r) => r.name).sort());
}

/** Replace a role's grants with exactly `keys`. */
export async function replaceRoleGrants(roleId: number, keys: string[], actorId?: string) {
	const wanted = catalogKeys(keys);
	await db.transaction(async (tx) => {
		const ids = await permissionIds(tx, wanted);
		await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
		if (ids.size > 0) {
			await tx.insert(rolePermissions).values(
				[...ids.values()].map((permissionId) => ({ roleId, permissionId, createdBy: actorId }))
			);
		}
	});
}

/** Replace a user's special (per-user) grants with exactly `keys`. */
export async function replaceUserGrants(userId: string, keys: string[], actorId?: string) {
	const wanted = catalogKeys(keys);
	await db.transaction(async (tx) => {
		const ids = await permissionIds(tx, wanted);
		await tx.delete(specialPermissions).where(eq(specialPermissions.userId, userId));
		if (ids.size > 0) {
			await tx.insert(specialPermissions).values(
				[...ids.values()].map((permissionId) => ({ userId, permissionId, createdBy: actorId }))
			);
		}
	});
}
