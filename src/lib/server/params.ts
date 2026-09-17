import { error } from '@sveltejs/kit';

/**
 * Parse a numeric route param (e.g. `params.id`). Anything that isn't a
 * positive integer is a 404 — `Number('abc')` is NaN, and mysql2 sends NaN
 * unquoted, which MySQL rejects as an unknown column (a 500).
 */
export function parseIdParam(value: string | undefined): number {
	const id = Number(value);
	if (!value || !Number.isInteger(id) || id <= 0) error(404, 'Not found');
	return id;
}

/** Same check for ids posted in forms; returns null instead of throwing. */
export function toPositiveInt(value: unknown): number | null {
	const id = Number(value);
	return Number.isInteger(id) && id > 0 ? id : null;
}
