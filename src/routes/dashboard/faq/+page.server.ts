import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, asc } from 'drizzle-orm';

import { addFaq, editFaq, deleteFaq, moveFaq, resetFaq } from './schema';
import { db } from '$lib/server/db';
import { faqItems } from '$lib/server/db/schema';
import { DEFAULT_FAQ } from '$lib/faqItems';
import type { Actions, PageServerLoad } from './$types';

const ordered = () =>
	db
		.select()
		.from(faqItems)
		.orderBy(asc(faqItems.sortOrder), asc(faqItems.id));

/**
 * The first edit of any kind copies the nine bundled questions into the table,
 * so the operator starts from what the site already says rather than a blank
 * list. Until then the table stays empty and the page follows the code.
 */
async function ensureSeeded(userId: string | undefined) {
	const [existing] = await db.select({ id: faqItems.id }).from(faqItems).limit(1);
	if (existing) return;

	await db.insert(faqItems).values(
		DEFAULT_FAQ.map((entry, index) => ({
			sortOrder: index,
			icon: entry.icon,
			questionEn: entry.questionEn,
			questionAm: entry.questionAm,
			answerEn: entry.answerEn,
			answerAm: entry.answerAm,
			createdBy: userId
		}))
	);
}

export const load: PageServerLoad = async () => {
	const stored = await ordered();

	// Before the first edit there are no rows, so show the bundled list as the
	// preview — otherwise the screen would look empty while the site shows nine
	// questions.
	const usingDefaults = stored.length === 0;

	const allData = usingDefaults
		? DEFAULT_FAQ.map((entry, index) => ({
				id: -(index + 1),
				sortOrder: index,
				icon: entry.icon,
				questionEn: entry.questionEn,
				questionAm: entry.questionAm,
				answerEn: entry.answerEn,
				answerAm: entry.answerAm,
				isActive: true
			}))
		: stored;

	return {
		allData,
		usingDefaults,
		form: await superValidate(zod4(addFaq)),
		editForm: await superValidate(zod4(editFaq)),
		deleteForm: await superValidate(zod4(deleteFaq)),
		moveForm: await superValidate(zod4(moveFaq)),
		resetForm: await superValidate(zod4(resetFaq))
	};
};

const failed = (form: any, text: string, status: 400 | 500 = 500) =>
	message(form, { type: 'error', text }, { status });

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addFaq));
		if (!form.valid) return failed(form, 'Please check the form for errors', 400);

		try {
			await ensureSeeded(locals?.user?.id);
			const rows = await ordered();
			await db.insert(faqItems).values({
				sortOrder: rows.length,
				icon: form.data.icon,
				questionEn: form.data.questionEn,
				questionAm: form.data.questionAm || null,
				answerEn: form.data.answerEn,
				answerAm: form.data.answerAm || null,
				isActive: form.data.isActive,
				createdBy: locals?.user?.id
			});
			return message(form, { type: 'success', text: 'Question added' });
		} catch (err) {
			console.error('faq add failed', err);
			return failed(form, 'Could not add the question.');
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editFaq));
		if (!form.valid) return failed(form, 'Please check the form for errors', 400);

		try {
			await ensureSeeded(locals?.user?.id);
			// A negative id means the operator edited a bundled question before
			// anything was stored. Seeding has just created the real rows, so
			// resolve it by position rather than by the placeholder id.
			const id =
				form.data.id < 0
					? (await ordered())[-form.data.id - 1]?.id
					: form.data.id;

			if (!id) return failed(form, 'That question no longer exists.', 400);

			await db
				.update(faqItems)
				.set({
					icon: form.data.icon,
					questionEn: form.data.questionEn,
					questionAm: form.data.questionAm || null,
					answerEn: form.data.answerEn,
					answerAm: form.data.answerAm || null,
					isActive: form.data.isActive,
					updatedBy: locals?.user?.id
				})
				.where(eq(faqItems.id, id));

			return message(form, { type: 'success', text: 'Question updated' });
		} catch (err) {
			console.error('faq edit failed', err);
			return failed(form, 'Could not save the question.');
		}
	},

	remove: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(deleteFaq));
		if (!form.valid) return failed(form, 'Nothing to remove', 400);

		try {
			await ensureSeeded(locals?.user?.id);
			const rows = await ordered();
			const id = form.data.id < 0 ? rows[-form.data.id - 1]?.id : form.data.id;
			if (!id) return failed(form, 'That question no longer exists.', 400);

			await db.delete(faqItems).where(eq(faqItems.id, id));
			return message(form, { type: 'success', text: 'Question removed' });
		} catch (err) {
			console.error('faq delete failed', err);
			return failed(form, 'Could not remove the question.');
		}
	},

	move: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(moveFaq));
		if (!form.valid) return failed(form, 'Could not reorder', 400);

		try {
			await ensureSeeded(locals?.user?.id);
			const rows = await ordered();
			const index =
				form.data.id < 0 ? -form.data.id - 1 : rows.findIndex((row) => row.id === form.data.id);
			const target = form.data.direction === 'up' ? index - 1 : index + 1;

			if (index < 0 || target < 0 || target >= rows.length) {
				return message(form, { type: 'success', text: 'Already at the end' });
			}

			// Swap the two rows' positions. Written as an explicit pair rather than
			// a re-number of the whole list so a concurrent edit elsewhere in the
			// list is not silently overwritten.
			await db.transaction(async (tx) => {
				await tx
					.update(faqItems)
					.set({ sortOrder: target, updatedBy: locals?.user?.id })
					.where(eq(faqItems.id, rows[index].id));
				await tx
					.update(faqItems)
					.set({ sortOrder: index, updatedBy: locals?.user?.id })
					.where(eq(faqItems.id, rows[target].id));
			});

			return message(form, { type: 'success', text: 'Order updated' });
		} catch (err) {
			console.error('faq move failed', err);
			return failed(form, 'Could not reorder the questions.');
		}
	},

	reset: async ({ request }) => {
		const form = await superValidate(request, zod4(resetFaq));
		if (!form.valid) return failed(form, 'Nothing to reset', 400);

		try {
			await db.delete(faqItems);
			return message(form, { type: 'success', text: 'Restored the original questions' });
		} catch (err) {
			console.error('faq reset failed', err);
			return failed(form, 'Could not restore the originals.');
		}
	}
};
