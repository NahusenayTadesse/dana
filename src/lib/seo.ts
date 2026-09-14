import { env } from '$env/dynamic/public';

/**
 * Canonical origin for every absolute URL search engines see: canonical links,
 * og:url, sitemap entries, JSON-LD. Deliberately NOT the request origin — while
 * the site runs on test.dsfet.com, its canonicals already point at dsfet.com,
 * so the test host is never indexed as a duplicate. PUBLIC_SITE_URL overrides it.
 */
const DEFAULT_SITE_URL = 'https://dsfet.com';

export function siteOrigin(): string {
	return (env.PUBLIC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

/** Resolve a site path or stored asset URL against the canonical origin. */
export function absoluteUrl(pathOrUrl: string, origin: string): string {
	if (!pathOrUrl) return '';
	if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
	return `${origin}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
}

/** Plain-text summary for a meta description: tags stripped, cut on a word boundary. */
export function metaDescription(text: string | null | undefined, max = 160): string {
	const plain = (text ?? '')
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	if (plain.length <= max) return plain;
	const cut = plain.slice(0, max - 1);
	return `${cut.slice(0, cut.lastIndexOf(' ') > 80 ? cut.lastIndexOf(' ') : cut.length)}…`;
}

/**
 * A JSON-LD <script> tag, safe to {@html}. Escaping `<` keeps an admin-entered
 * "</script>" in a product description from closing the tag early.
 */
export function jsonLdScript(data: unknown): string {
	const json = JSON.stringify(data).replace(/</g, '\\u003c');
	return `<script type="application/ld+json">${json}</script>`;
}

/** Public, indexable pages with no dynamic segment — the static part of the sitemap. */
export const STATIC_PUBLIC_PATHS = [
	'/',
	'/about',
	'/shop',
	'/buy',
	'/factory',
	'/blogs',
	'/contact-us'
] as const;
