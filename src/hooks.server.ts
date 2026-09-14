import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { isAdmin } from '$lib/server/adminGuard';

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

// Form actions never run layout `load`, so the Admin check in
// dashboard/+layout.server.ts guarded the pages but not a single POST: anyone,
// signed in or not, could call ?/add, ?/edit, ?/delete on every dashboard
// route. Page loads (GET) keep the layout's redirect-to-login behaviour.
const handleDashboardActions: Handle = async ({ event, resolve }) => {
	const isRead = event.request.method === 'GET' || event.request.method === 'HEAD';

	if (!isRead && event.route.id?.startsWith('/dashboard') && !(await isAdmin(event.locals.user?.id))) {
		return new Response('Not allowed', { status: event.locals.user ? 403 : 401 });
	}

	return resolve(event);
};

export const handle: Handle = sequence(handleBetterAuth, handleDashboardActions, handleParaglide);
