import { db } from '$lib/server/db';
import { roles, user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/** The user's role name straight from the database, or null for no role. */
export async function getRoleName(userId: string): Promise<string | null> {
	return db
		.select({ name: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId))
		.then((rows) => rows[0]?.name ?? null);
}

export async function isAdmin(userId: string | undefined): Promise<boolean> {
	return !!userId && (await getRoleName(userId)) === 'Admin';
}
