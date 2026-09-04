import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { promoCodes } from '$lib/server/db/schema';
import type { Actions, PageServerLoad } from './$types';
import type { PromoRow } from './types';

/** `YYYY-MM-DD` as the date inputs expect it, in the server's own timezone. */
function toDateInput(value: Date | null): string {
	if (!value) return '';
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

/**
 * A start date opens the day; an end date closes it. Storing the end as
 * midnight would expire the code a day early — dashboard/quotes rejects on
 * `now > expiresAt`, so 2026-12-31 has to mean the end of the 31st.
 */
function startOfDay(value: string | null): Date | null {
	return value ? new Date(`${value}T00:00:00`) : null;
}

function endOfDay(value: string | null): Date | null {
	return value ? new Date(`${value}T23:59:59.999`) : null;
}

const dayLabel = (value: Date) =>
	value.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function windowLabel(startsAt: Date | null, expiresAt: Date | null): string {
	if (startsAt && expiresAt) return `${dayLabel(startsAt)} – ${dayLabel(expiresAt)}`;
	if (startsAt) return `From ${dayLabel(startsAt)}`;
	if (expiresAt) return `Until ${dayLabel(expiresAt)}`;
	return 'Always';
}

/**
 * The same four conditions dashboard/quotes/[id] checks before letting a code
 * onto an offer, so what this table says is what the sales desk will hit.
 */
function statusOf(
	row: { isActive: boolean; startsAt: Date | null; expiresAt: Date | null; maxUses: number | null; timesUsed: number },
	now: Date
): PromoRow['status'] {
	if (!row.isActive) return 'Off';
	if (row.startsAt && now < row.startsAt) return 'Scheduled';
	if (row.expiresAt && now > row.expiresAt) return 'Expired';
	if (row.maxUses != null && row.timesUsed >= row.maxUses) return 'Used up';
	return 'Active';
}

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const stored = await db
		.select({
			id: promoCodes.id,
			code: promoCodes.code,
			discountPercentage: promoCodes.discountPercentage,
			reason: promoCodes.reason,
			startsAt: promoCodes.startsAt,
			expiresAt: promoCodes.expiresAt,
			maxUses: promoCodes.maxUses,
			timesUsed: promoCodes.timesUsed,
			isActive: promoCodes.isActive
		})
		.from(promoCodes)
		.orderBy(promoCodes.code);

	const now = new Date();

	const allData: PromoRow[] = stored.map((row) => ({
		id: row.id,
		code: row.code,
		discountPercentage: Number(row.discountPercentage),
		discountLabel: `${Number(row.discountPercentage)}%`,
		reason: row.reason ?? '',
		startsAt: toDateInput(row.startsAt),
		expiresAt: toDateInput(row.expiresAt),
		window: windowLabel(row.startsAt, row.expiresAt),
		maxUses: row.maxUses,
		timesUsed: row.timesUsed,
		usage: row.maxUses == null ? `${row.timesUsed} of unlimited` : `${row.timesUsed} of ${row.maxUses}`,
		isActive: row.isActive,
		status: statusOf(row, now)
	}));

	return { form, editForm, allData };
};

/**
 * Drizzle wraps the driver error in a DrizzleQueryError, so `err.code` is
 * undefined and a plain `err.code === 'ER_DUP_ENTRY'` check never fires — the
 * operator gets the raw INSERT statement instead of "that code already exists".
 * Walk the cause chain for the real driver code.
 */
function isDuplicate(err: unknown): boolean {
	let current: any = err;
	for (let depth = 0; current && depth < 5; depth++) {
		if (current.code === 'ER_DUP_ENTRY' || current.errno === 1062) return true;
		current = current.cause;
	}
	return false;
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		const { code, discountPercentage, reason, startsAt, expiresAt, maxUses, isActive } = form.data;

		try {
			await db.insert(promoCodes).values({
				code: code.toUpperCase(),
				discountPercentage: String(discountPercentage),
				reason: reason || null,
				startsAt: startOfDay(startsAt),
				expiresAt: endOfDay(expiresAt),
				maxUses: maxUses ?? null,
				isActive,
				createdBy: locals?.user?.id
			});

			return message(form, { type: 'success', text: `Promo code ${code.toUpperCase()} created` });
		} catch (err) {
			if (isDuplicate(err)) {
				setError(form, 'code', 'That code already exists.');
				return message(form, { type: 'error', text: 'That code already exists.' }, { status: 400 });
			}
			console.error('promo-codes save failed', err);
			// Never the driver message: it echoes the whole INSERT back into the UI.
			return message(form, { type: 'error', text: 'Could not save the promo code.' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

		const { id, code, discountPercentage, reason, startsAt, expiresAt, maxUses, isActive } = form.data;

		try {
			// `timesUsed` is deliberately untouched: offers already saved against
			// this code counted against its limit, and rewriting the tally here
			// would let a code be reused past the cap it was sold under.
			await db
				.update(promoCodes)
				.set({
					code: code.toUpperCase(),
					discountPercentage: String(discountPercentage),
					reason: reason || null,
					startsAt: startOfDay(startsAt),
					expiresAt: endOfDay(expiresAt),
					maxUses: maxUses ?? null,
					isActive,
					updatedBy: locals?.user?.id
				})
				.where(eq(promoCodes.id, id));

			return message(form, { type: 'success', text: `Promo code ${code.toUpperCase()} updated` });
		} catch (err) {
			if (isDuplicate(err)) {
				setError(form, 'code', 'That code already exists.');
				return message(form, { type: 'error', text: 'That code already exists.' }, { status: 400 });
			}
			console.error('promo-codes save failed', err);
			// Never the driver message: it echoes the whole INSERT back into the UI.
			return message(form, { type: 'error', text: 'Could not save the promo code.' }, { status: 500 });
		}
	}
};
