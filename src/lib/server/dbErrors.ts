// Drizzle wraps every driver error in a DrizzleQueryError whose message is the
// full SQL statement and its params; the MySQL `code`/`errno` live on `.cause`.
// So `err.code === 'ER_DUP_ENTRY'` never matches, and echoing `err.message`
// shows staff raw SQL. Use these instead.

function driverErrors(err: unknown): Array<{ code?: string; errno?: number }> {
	const chain: Array<{ code?: string; errno?: number }> = [];
	let current: any = err;
	for (let depth = 0; current && depth < 5; depth++) {
		chain.push(current);
		current = current.cause;
	}
	return chain;
}

/** A unique index rejected the write (MySQL 1062). */
export function isDuplicateEntry(err: unknown): boolean {
	return driverErrors(err).some((e) => e.code === 'ER_DUP_ENTRY' || e.errno === 1062);
}

/** The row is still referenced by another table (MySQL 1451). */
export function isRowReferenced(err: unknown): boolean {
	return driverErrors(err).some(
		(e) => e.code === 'ER_ROW_IS_REFERENCED_2' || e.code === 'ER_ROW_IS_REFERENCED' || e.errno === 1451
	);
}

/** The write points at a row that doesn't exist (MySQL 1452). */
export function isMissingReference(err: unknown): boolean {
	return driverErrors(err).some((e) => e.code === 'ER_NO_REFERENCED_ROW_2' || e.errno === 1452);
}

/** A value is too long / out of range for its column (MySQL 1406 / 1264). */
export function isValueOutOfRange(err: unknown): boolean {
	return driverErrors(err).some(
		(e) =>
			e.code === 'ER_DATA_TOO_LONG' ||
			e.code === 'ER_WARN_DATA_OUT_OF_RANGE' ||
			e.errno === 1406 ||
			e.errno === 1264
	);
}

/**
 * A staff-safe description of a failed write — never the SQL text. Log the
 * original error server-side before calling this.
 */
export function describeDbError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
	if (isDuplicateEntry(err)) return 'That already exists.';
	if (isRowReferenced(err)) return 'It is still in use elsewhere, so it can’t be removed.';
	if (isMissingReference(err)) return 'A selected item no longer exists. Reload the page and try again.';
	if (isValueOutOfRange(err)) return 'A value is too long or too large.';
	return fallback;
}
