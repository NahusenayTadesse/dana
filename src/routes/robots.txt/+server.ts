import { siteOrigin } from '$lib/seo';
import type { RequestHandler } from './$types';

// Served from a route rather than static/ so the Sitemap line always carries
// the real domain. Checkout, quote and payment pages are left crawlable on
// purpose: they carry noindex, and a crawler has to fetch them to see it.
export const GET: RequestHandler = () => {
	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /dashboard',
		'Disallow: /account',
		'Disallow: /api/',
		'Disallow: /demo',
		'',
		`Sitemap: ${siteOrigin()}/sitemap.xml`,
		''
	].join('\n');

	return new Response(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
