import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { error, json } from '@sveltejs/kit';
import { getAccess, hasDashboardAccess } from '$lib/server/permissions';
import { checkRoute } from '$lib/server/permissionRules';

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

// Every dashboard request is checked against the permission rules in
// $lib/server/permissionRules.ts. This has to happen here rather than only in
// the dashboard layout's `load`: form actions never run layout loads, and a
// client-side navigation fetches just the page's own data, skipping the layout.
const handleDashboardPermissions: Handle = async ({ event, resolve }) => {
	const routeId = event.route.id;
	if (!routeId?.startsWith('/dashboard')) return resolve(event);

	const isRead = event.request.method === 'GET' || event.request.method === 'HEAD';
	const user = event.locals.user;

	if (!user) {
		// Page loads fall through to the layout's redirect-to-login.
		if (isRead) return resolve(event);
		return new Response('Not signed in', { status: 401 });
	}

	const access = await getAccess(user.id);
	event.locals.access = access;

	// A form action is addressed as `?/name`; an unnamed one is `default`.
	const action = isRead
		? undefined
		: ([...event.url.searchParams.keys()].find((key) => key.startsWith('/'))?.slice(1) ?? 'default');

	const check = hasDashboardAccess(access)
		? checkRoute(routeId, action, access)
		: ({ allowed: false, reason: 'forbidden' } as const);

	if (check.allowed) return resolve(event);

	if (check.reason === 'unmapped') {
		console.warn(
			`[permissions] No rule for ${routeId}${action ? ` ?/${action}` : ''} — allowed for super admins only.`
		);
	}

	const message = isRead
		? 'You don’t have permission to view this page.'
		: 'You don’t have permission to do that.';

	if (isRead) {
		// Full page loads render the dashboard layout, which turns this into a
		// proper error page (or a redirect to a page the user may open).
		if (!event.isDataRequest) {
			event.locals.denied = message;
			return resolve(event);
		}
		error(403, message);
	}

	// An enhanced form submit expects an ActionResult; answering with one makes
	// the client show the error instead of failing to parse a plain response.
	if (event.request.headers.get('x-sveltekit-action') === 'true') {
		return json({ type: 'error', error: { message } }, { status: 403 });
	}
	return new Response(message, { status: 403 });
};

export const handle: Handle = sequence(handleBetterAuth, handleDashboardPermissions, handleParaglide);
