import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { editGallery } from './schema';

import { db } from '$lib/server/db';
import { gallery } from '$lib/server/db/schema';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { describeDbError } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

/** Best-effort removal — a failed unlink must never fail the save. */
const removeFiles = (names: string[]) =>
	Promise.all(names.map((name) => deleteUploadedFile(name).catch(() => {})));

async function storedLogos(): Promise<string[]> {
	const rows = await db.select({ imageUrl: gallery.imageUrl }).from(gallery).orderBy(gallery.id);
	return rows.map((row) => row.imageUrl).filter((url): url is string => !!url);
}

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(editGallery));

	return { form, gallery: await storedLogos() };
};

export const actions: Actions = {
	editGallery: async ({ request }) => {
		const form = await superValidate(request, zod4(editGallery));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the logo images.' },
				{ status: 400 }
			);
		}

		const { existing, images } = form.data;
		const uploaded: string[] = [];

		try {
			const previous = await storedLogos();

			// Only logos that are already stored can be "kept" — the list comes
			// from the browser, so anything else in it is ignored.
			const kept = existing
				.split(',')
				.map((value) => value.trim())
				.filter((value) => value && previous.includes(value));

			// Uploads happen before the transaction (and sequentially, so every
			// file written is tracked for cleanup if something fails).
			for (const file of images ?? []) {
				if (!file?.size) continue;
				uploaded.push(await saveUploadedFile(file));
			}

			const finalList = [...new Set([...kept, ...uploaded])];

			await db.transaction(async (tx) => {
				await tx.delete(gallery);
				if (finalList.length > 0) {
					await tx.insert(gallery).values(finalList.map((imageUrl) => ({ imageUrl })));
				}
			});

			// Logos the admin removed are no longer referenced.
			await removeFiles(previous.filter((name) => !finalList.includes(name)));

			return message(form, { type: 'success', text: 'Partner logos saved.' });
		} catch (err) {
			// The DB write never happened (or rolled back): the new files are orphans.
			await removeFiles(uploaded);

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('Error saving partner logos:', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save the partner logos.') },
				{ status: 500 }
			);
		}
	}
};
