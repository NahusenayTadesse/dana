export const bgGradient = `bg-linear-to-r from-background  to-secondary`;
export const selectItem = `hover:bg-gray-100 hover:shadow-md hover:scale-101 duration-300 transition-all ease-in-out dark:hover:bg-gray-900`;
export const toastmsg = `fixed right-4 bottom-20 lg:bottom-4 z-50
             flex items-center gap-3
             bg-green-600 text-white font-medium
             px-5 py-3 rounded-xl shadow-lg
             animate-slide-in`;
export const errormsg = `${toastmsg} !bg-red-600`;
export const searchableFields = [
	'name',
	'description',
	'permissions',
	'value',
	'firstName',
	'lastName',
	'phone',
	'date',
	'time',
	'bookedBy',
	'notes',
	'bookedAt',
	'customerName',
	'date',
	'time'
];

export const dropdownClass = `flex capitalize flex-row gap-2 ${selectItem}`;

export const gender = [
	{ value: 'male', name: 'Male' },
	{ value: 'female', name: 'Female' }
];

export function minutesToHoursString(minutes: number) {
	const h = Math.floor(minutes / 60);
	const m = minutes % 60;
	return `${h}h ${m}m`;
}

import { sql } from 'drizzle-orm';
import type { MySqlColumn } from 'drizzle-orm/mysql-core';
import { SvelteDate } from 'svelte/reactivity';

export function extractUsername(email: string) {
	if (typeof email !== 'string') {
		throw new Error('Input must be a string');
	}

	// Find the part before the '@'
	const atIndex = email.indexOf('@');

	if (atIndex === -1) {
		throw new Error("Invalid email address: missing '@'");
	}

	return email.substring(0, atIndex);
}

export function getCurrentMonthRange(): string {
	// Today's date in the business timezone, not the server's or the browser's —
	// otherwise the default report range starts or ends on the wrong day for
	// three hours around midnight.
	const todayStr = new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Africa/Addis_Ababa',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());

	const firstOfMonth = `${todayStr.slice(0, 7)}-01`;

	return `${firstOfMonth}-${todayStr}`;
}

const isoDate = (value: string) => {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
	const [y, m, d] = value.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
};

/**
 * Parse a `YYYY-MM-DD-YYYY-MM-DD` route param. Returns null for anything else
 * (a malformed or impossible date, or a start after the end) so the load can
 * 404 instead of querying with `Invalid Date`.
 */
export function parseDateRange(range: string | undefined): { start: string; end: string } | null {
	const match = /^(\d{4}-\d{2}-\d{2})-(\d{4}-\d{2}-\d{2})$/.exec(range ?? '');
	if (!match) return null;
	const [, start, end] = match;
	if (!isoDate(start) || !isoDate(end) || start > end) return null;
	return { start, end };
}

export const currentMonthFilter = (dateField: MySqlColumn, start?: string, end?: string) => {
	// If start/end are passed, filter whole calendar days. Both bounds stay plain
	// `YYYY-MM-DD` strings compared in the database: the end used to go through
	// `new Date('YYYY-MM-DD')` (UTC midnight) and then a local setHours, which
	// dropped the last day on servers behind UTC.
	if (start && end) {
		return sql`${dateField} >= ${start} AND ${dateField} < DATE_ADD(${end}, INTERVAL 1 DAY)`;
	}

	// Otherwise fallback to current-month logic
	const currentYear = new SvelteDate().getFullYear();
	const currentMonth = new SvelteDate().getMonth() + 1;

	return sql`
    EXTRACT(YEAR FROM ${dateField}) = ${currentYear}
    AND EXTRACT(MONTH FROM ${dateField}) = ${currentMonth}
  `;
};

import crypto from 'crypto';

export function generatePassword(
	length: number = 8,
	options = {
		lowercase: true,
		uppercase: true,
		numbers: true,
		symbols: true
	}
): string {
	const lowers = 'abcdefghijklmnopqrstuvwxyz';
	const uppers = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
	const nums = '0123456789';
	const syms = '!@#$%^&*()-_=+[]{};:,.<>/?';

	let chars = '';
	if (options.lowercase) chars += lowers;
	if (options.uppercase) chars += uppers;
	if (options.numbers) chars += nums;
	if (options.symbols) chars += syms;

	if (!chars) throw new Error('No character sets selected!');

	let password = '';
	const charArray = chars.split('');

	for (let i = 0; i < length; i++) {
		const randomIndex = crypto.randomInt(0, charArray.length);
		password += charArray[randomIndex];
	}

	return password;
}

export function formatETB(amount: number, useAmharic: boolean = false): string {
	// 'am-ET' for Amharic/Ethiopic script (ብር)
	// 'en-ET' for English/Latin script (Br)
	const locale = useAmharic ? 'am-ET' : 'en-ET';

	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency: 'ETB',
		// Optional: Controls whether to show "ETB", "Br", or "ብር"
		currencyDisplay: 'symbol',
		minimumFractionDigits: 2
	}).format(amount);
}

export type Item = {
	value: string | number;
	name: string;
};

export const formatEthiopianDate = (date: Date | string | undefined): string => {
	if (!date) return '';

	const newDate = new SvelteDate(date);

	const formatter = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	return formatter.format(newDate);
};
