import { and, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { blog } from '$lib/server/db/schema';
import { slugify } from '$lib/slug';

/**
 * A URL-safe slug that no other post uses.
 *
 * `blog.slug` has no unique index and `/blogs/[slug]` loads the first match, so
 * a duplicate would make one of the two posts unreachable. The requested slug
 * (or, failing that, the title) is slugified, then `-2`, `-3`, … is appended
 * until it is free. Titles with no Latin characters slugify to '', so those
 * fall back to a timestamped slug.
 */
export async function uniqueBlogSlug(requested: string, title: string, exceptId?: number) {
	const base = slugify(requested) || slugify(title) || `post-${Date.now()}`;

	const taken = new Set(
		(
			await db
				.select({ slug: blog.slug })
				.from(blog)
				.where(
					and(
						sql`lower(${blog.slug}) like ${base + '%'}`,
						exceptId ? ne(blog.id, exceptId) : undefined
					)
				)
		).map((row) => row.slug.toLowerCase())
	);

	if (!taken.has(base)) return base;
	for (let n = 2; ; n++) {
		const candidate = `${base}-${n}`;
		if (!taken.has(candidate)) return candidate;
	}
}
