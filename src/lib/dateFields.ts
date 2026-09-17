/**
 * Conversions between a `<input type="date">` value and what the database
 * wants. Shared because three dashboard screens now round-trip a date field,
 * and SvelteKit refuses arbitrary exports from a `+page.server.ts`, so this
 * cannot live beside the load that first needed it.
 */

/**
 * A stored date as `YYYY-MM-DD`, which is what the date input binds to.
 *
 * drizzle reads a MySQL `date` as the string `YYYY-MM-DD` and turns it into
 * `new Date('YYYY-MM-DD')` — which JavaScript parses as UTC midnight. Reading
 * it back with local getters showed the previous day on any server behind UTC
 * (and each save then stored that earlier day), so this uses the UTC getters.
 */
export function toDateInput(value: Date | string | null | undefined): string {
	if (!value) return '';
	if (typeof value === 'string') return value.slice(0, 10);
	if (Number.isNaN(value.getTime())) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

/**
 * The form's `YYYY-MM-DD` as a Date, which is what drizzle's `date()` columns
 * expect. Local midnight on purpose: mysql2 (default `timezone: 'local'`)
 * formats a Date with local getters, so this writes back the same day that was
 * picked whatever the server's timezone.
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
