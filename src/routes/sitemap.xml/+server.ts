import { db } from '$lib/server/db';
import { blog, products } from '$lib/server/db/schema';
import { absoluteUrl, siteOrigin, STATIC_PUBLIC_PATHS } from '$lib/seo';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

type Entry = { loc: string; lastmod?: Date | null };

const xmlEscape = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

export const GET: RequestHandler = async () => {
	const origin = siteOrigin();

	const [productRows, blogRows] = await Promise.all([
		db
			.select({ slug: products.slug, updatedAt: products.updatedAt })
			.from(products)
			.where(eq(products.isActive, true)),
		db
			.select({ slug: blog.slug, updatedAt: blog.updatedAt })
			.from(blog)
			.where(eq(blog.isActive, true))
	]);

	const entries: Entry[] = [
		...STATIC_PUBLIC_PATHS.map((path) => ({ loc: absoluteUrl(path, origin) })),
		...productRows.map((p) => ({
			loc: absoluteUrl(`/shop/single/${encodeURIComponent(p.slug)}`, origin),
			lastmod: p.updatedAt
		})),
		...blogRows.map((b) => ({
			loc: absoluteUrl(`/blogs/${encodeURIComponent(b.slug)}`, origin),
			lastmod: b.updatedAt
		}))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
	.map(
		(e) =>
			`	<url><loc>${xmlEscape(e.loc)}</loc>${
				e.lastmod ? `<lastmod>${e.lastmod.toISOString()}</lastmod>` : ''
			}</url>`
	)
	.join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600'
		}
	});
};
