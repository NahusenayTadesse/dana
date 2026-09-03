import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, inArray, and, ne } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { siteImages as siteImagesTable } from '$lib/server/db/schema';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { SITE_IMAGE_SLOTS, SITE_IMAGE_SLOT_MAP, type SiteImageSlot } from '$lib/siteImages';
import { updateSlotSchema, resetSlotSchema } from './schema';
import type { Actions, PageServerLoad } from './$types';

/** A stored value is an upload we own (and may delete) unless it's a bundled asset. */
function isUpload(value: string): boolean {
	return !!value && !value.startsWith('/') && !/^https?:/i.test(value);
}

/**
 * Remove upload files that no slot references any more.
 *
 * Slot rows are rewritten wholesale on every save, so anything dropped from a
 * slot would otherwise sit on disk forever. Bundled static assets are never
 * touched, and a file still referenced somewhere else is left alone.
 */
async function pruneOrphanedUploads(removed: string[], slot: string) {
	const candidates = [...new Set(removed.filter(isUpload))];
	if (!candidates.length) return;

	// A UUID name is unique per upload, so a hit here means another slot points
	// at the same file — possible only if rows were seeded by hand, but cheap
	// to check and expensive to get wrong.
	const stillUsed = await db
		.select({ imageUrl: siteImagesTable.imageUrl })
		.from(siteImagesTable)
		.where(and(inArray(siteImagesTable.imageUrl, candidates), ne(siteImagesTable.slot, slot)));

	const keep = new Set(stillUsed.map((row) => row.imageUrl));

	await Promise.all(
		candidates
			.filter((name) => !keep.has(name))
			// A failed cleanup must not fail the save — the DB is already correct.
			.map((name) => deleteUploadedFile(name).catch(() => {}))
	);
}

/** Current stored values for one slot, in order. */
async function storedFor(slot: string): Promise<string[]> {
	const rows = await db
		.select({ imageUrl: siteImagesTable.imageUrl, sortOrder: siteImagesTable.sortOrder })
		.from(siteImagesTable)
		.where(eq(siteImagesTable.slot, slot))
		.orderBy(siteImagesTable.sortOrder);
	return rows.map((row) => row.imageUrl);
}

/** Replace every row for a slot with `values`; an empty list reverts to defaults. */
async function writeSlot(slot: string, values: string[]) {
	await db.transaction(async (tx) => {
		await tx.delete(siteImagesTable).where(eq(siteImagesTable.slot, slot));
		if (values.length) {
			await tx
				.insert(siteImagesTable)
				.values(values.map((imageUrl, index) => ({ slot, imageUrl, sortOrder: index })));
		}
	});
}

function parseExisting(existing: string): string[] {
	return existing
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);
}

export const load: PageServerLoad = async () => {
	const updateForm = await superValidate(zod4(updateSlotSchema));
	const resetForm = await superValidate(zod4(resetSlotSchema));

	const rows = await db
		.select({
			slot: siteImagesTable.slot,
			imageUrl: siteImagesTable.imageUrl,
			sortOrder: siteImagesTable.sortOrder
		})
		.from(siteImagesTable)
		.orderBy(siteImagesTable.slot, siteImagesTable.sortOrder);

	const bySlot = new Map<string, string[]>();
	for (const row of rows) {
		const list = bySlot.get(row.slot);
		if (list) list.push(row.imageUrl);
		else bySlot.set(row.slot, [row.imageUrl]);
	}

	// One table row per registered slot, whether or not it has been customised.
	const slots = SITE_IMAGE_SLOTS.map((slot) => {
		const custom = bySlot.get(slot.key) ?? [];
		return {
			key: slot.key,
			label: slot.label,
			section: slot.section,
			page: slot.page,
			kind: slot.kind,
			description: slot.description,
			recommended: slot.recommended ?? '',
			maxCount: slot.maxCount ?? null,
			defaults: slot.defaults,
			isCustom: custom.length > 0,
			/** Raw stored values — bundled paths or upload names. */
			values: custom.length ? custom : slot.defaults
		};
	});

	return { updateForm, resetForm, slots };
};

export const actions: Actions = {
	updateSlot: async ({ request }) => {
		const form = await superValidate(request, zod4(updateSlotSchema));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors.' },
				{ status: 400 }
			);
		}

		const definition: SiteImageSlot = SITE_IMAGE_SLOT_MAP[form.data.slot];
		const kept = parseExisting(form.data.existing);
		const incoming =
			definition.kind === 'single'
				? form.data.image
					? [form.data.image]
					: []
				: (form.data.images ?? []).filter((file) => file && file.size > 0);

		// A single slot's new upload replaces whatever was there; a gallery's is
		// appended after the images the admin chose to keep.
		const keptForSlot = definition.kind === 'single' && incoming.length ? [] : kept;

		if (definition.kind === 'single' && keptForSlot.length + incoming.length > 1) {
			return message(
				form,
				{ type: 'error', text: `${definition.label} holds a single image.` },
				{ status: 400 }
			);
		}

		if (definition.maxCount && keptForSlot.length + incoming.length > definition.maxCount) {
			return message(
				form,
				{
					type: 'error',
					text: `${definition.label} holds at most ${definition.maxCount} images — remove some before adding more.`
				},
				{ status: 400 }
			);
		}

		const previous = await storedFor(definition.key);
		let uploaded: string[] = [];

		try {
			// Sequential rather than Promise.all: a rejected upload mid-flight would
			// otherwise leave the successful ones unaccounted for in `uploaded`.
			for (const file of incoming) {
				uploaded.push(await saveUploadedFile(file));
			}

			const finalValues = [...new Set([...keptForSlot, ...uploaded])];

			// Saving a slot back to exactly its bundled defaults means "no override",
			// so it keeps following the code rather than pinning stale paths.
			const matchesDefaults =
				finalValues.length === definition.defaults.length &&
				finalValues.every((value, i) => value === definition.defaults[i]);

			await writeSlot(definition.key, matchesDefaults ? [] : finalValues);

			await pruneOrphanedUploads(
				previous.filter((value) => !finalValues.includes(value)),
				definition.key
			);

			return message(form, {
				type: 'success',
				text: finalValues.length
					? `${definition.label} updated.`
					: `${definition.label} restored to the default image.`
			});
		} catch (err) {
			// The DB write never happened (or rolled back), so the files we just
			// wrote are unreferenced — don't leave them behind.
			await Promise.all(uploaded.map((name) => deleteUploadedFile(name).catch(() => {})));

			const text =
				err instanceof UploadError
					? err.message
					: `Could not update ${definition.label}: ${(err as Error)?.message ?? 'unexpected error'}`;
			console.error('site-images updateSlot failed:', err);
			return message(form, { type: 'error', text }, { status: 500 });
		}
	},

	resetSlot: async ({ request }) => {
		const form = await superValidate(request, zod4(resetSlotSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		const definition = SITE_IMAGE_SLOT_MAP[form.data.slot];

		try {
			const previous = await storedFor(definition.key);
			await writeSlot(definition.key, []);
			await pruneOrphanedUploads(previous, definition.key);

			return message(form, {
				type: 'success',
				text: `${definition.label} restored to the default image${definition.kind === 'gallery' ? 's' : ''}.`
			});
		} catch (err) {
			console.error('site-images resetSlot failed:', err);
			return message(
				form,
				{ type: 'error', text: `Could not reset ${definition.label}.` },
				{ status: 500 }
			);
		}
	}
};
