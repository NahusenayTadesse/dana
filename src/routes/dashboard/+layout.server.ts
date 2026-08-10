import { db } from '$lib/server/db';
import { user, roles } from '$lib/server/db/schema';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

import { orders, contactMessages } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, depends }) => {
	if (!locals.user) {
		// `redirect`/`error` THROW. These were `return`ed, which happens to work
		// because SvelteKit inspects returned errors, but it reads as a guard
		// that doesn't guard — and one stray refactor away from being one.
		redirect(302, '/login');
	}

	// The role is queried here rather than read from `parent()`. The entire
	// admin boundary used to rest on a roleName computed in the ROOT layout,
	// which meant any change to that unrelated query silently widened access to
	// the whole dashboard.
	const roleName = await db
		.select({ name: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, locals.user.id))
		.then((rows) => rows[0]?.name ?? null);

	if (roleName !== 'Admin') {
		error(404, 'Not Allowed');
	}

	depends('app:messages');
	const name = locals?.user?.name;

	const ordersNumber = await db
		.select({ count: count(orders.id) })
		.from(orders)
		.where(eq(orders.status, 'pending'))
		.then((rows) => rows[0]?.count ?? 0);

	const messageNumber = await db
		.select({ count: count() })
		.from(contactMessages)
		.where(eq(contactMessages.seen, false))
		.then((rows) => rows[0]?.count ?? 0);

	return {
		name,
		ordersNumber,
		messageNumber
	};
};
