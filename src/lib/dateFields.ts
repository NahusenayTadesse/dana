/**
 * Conversions between a `<input type="date">` value and what the database
 * wants. Shared because three dashboard screens now round-trip a date field,
 * and SvelteKit refuses arbitrary exports from a `+page.server.ts`, so this
 * cannot live beside the load that first needed it.
 */

/** A stored date as `YYYY-MM-DD`, which is what the date input binds to. */
export function toDateInput(value: Date | string | null | undefined): string {
	if (!value) return '';
	if (typeof value === 'string') return value.slice(0, 10);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * The form's `YYYY-MM-DD` as a Date, which is what drizzle's `date()` columns
 * expect. Local midnight, so mysql2 formats back the same day that was picked.
 */
export function toDateValue(value: string | null | undefined): Date | null {
	return value ? new Date(`${value}T00:00:00`) : null;
}

/**
 * The same conversion for a column that cannot be null. The schema has already
 * required a `YYYY-MM-DD` string by the time this is called, so returning
 * `Date | null` here would only push a null-check onto every caller for a case
 * that cannot happen.
 */
export function requireDateValue(value: string): Date {
	return new Date(`${value}T00:00:00`);
}
