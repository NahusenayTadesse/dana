/**
 * URL-safe slug: lowercase ASCII letters, digits and single hyphens.
 * "Why PPGI? A guide" → "why-ppgi-a-guide". Characters like `?`, `#` and `/`
 * would otherwise end the path segment and make the page unreachable.
 */
export function slugify(input: string): string {
	return input
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 200);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
