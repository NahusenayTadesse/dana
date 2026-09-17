import { db } from '$lib/server/db';
import { getAccess, hasDashboardAccess } from '$lib/server/permissions';
import { checkRoute, landingPageFor, ROUTE_RULES } from '$lib/server/permissionRules';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { Access } from '$lib/permissions';

import { orders, contactMessages } from '$lib/server/db/schema';
import { eq, count } from 'drizzle-orm';

export const load: LayoutServerLoad = async ({ locals, depends, route }) => {
	if (!locals.user) {
		redirect(302, '/login');
	}

	// hooks.server.ts resolves access for every /dashboard request; resolve it
	// here too in case this load ever runs without that hook.
	const access = locals.access ?? (await getAccess(locals.user.id));

	if (!hasDashboardAccess(access)) {
		error(404, 'Not Allowed');
	}

	if (locals.denied) {
		// Someone who can't see the home page (e.g. warehouse staff) is sent to
		// the first page they can open instead of an error.
		if (route.id === '/dashboard') {
			const landing = landingPageFor(access);
			if (landing && landing !== '/dashboard') redirect(302, landing);
		}
		error(403, locals.denied);
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

	const clientAccess: Access = { superAdmin: access.superAdmin, permissions: access.permissions };

	// Static dashboard pages this user may open — the sidebar and page search
	// show only these, using the same rules hooks enforce.
	const allowedRoutes = Object.keys(ROUTE_RULES).filter(
		(routeId) => !routeId.includes('[') && checkRoute(routeId, undefined, access).allowed
	);

	return {
		name,
		ordersNumber,
		messageNumber,
		access: clientAccess,
		allowedRoutes
	};
};
