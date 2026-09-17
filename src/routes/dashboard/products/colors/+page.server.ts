import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { colors as department } from '$lib/server/db/schema';
import { isDuplicateEntry, describeDbError } from '$lib/server/dbErrors';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import type { Actions, PageServerLoad } from './$types';

/** Best-effort removal — a failed unlink must never fail the save. */
const removeFile = (name: string | null | undefined) =>
	name ? deleteUploadedFile(name).catch(() => {}) : Promise.resolve();

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));

	const allData = await db
		.select({
			id: department.id,
			name: department.name,
			hexValue: department.hexValue,
			code: department.code,
			image: department.swatchImage
		})
		.from(department);

	return {
		form,
		editForm,
		allData
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { name, code, hexValue, image } = form.data;
		let swatchImage: string | null = null;

		try {
			// Upload first so a slow write doesn't hold a DB connection; if the
			// insert then fails, the file is removed again below.
			swatchImage = image?.size ? await saveUploadedFile(image) : null;

			await db.insert(department).values({
				name,
				code: code || null,
				hexValue,
				swatchImage,
				createdBy: locals?.user?.id
			});

			return message(form, { type: 'success', text: 'Color Successfully Added' });
		} catch (err) {
			await removeFile(swatchImage);

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			if (isDuplicateEntry(err)) {
				setError(form, 'name', 'Color already exists.');
				return message(
					form,
					{ type: 'error', text: 'A color with that name already exists.' },
					{ status: 400 }
				);
			}
			console.error('color add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add the color.') },
				{ status: 500 }
			);
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { id, name, code, hexValue, image } = form.data;
		let swatchImage: string | null = null;

		try {
			const [current] = await db
				.select({ swatchImage: department.swatchImage })
				.from(department)
				.where(eq(department.id, id))
				.limit(1);

			if (!current) {
				return message(
					form,
					{ type: 'error', text: 'That color no longer exists.' },
					{ status: 404 }
				);
			}

			swatchImage = image?.size ? await saveUploadedFile(image) : null;

			await db
				.update(department)
				.set({
					name,
					// An emptied code is stored as NULL rather than silently kept.
					code: code || null,
					hexValue,
					...(swatchImage ? { swatchImage } : {}),
					updatedBy: locals?.user?.id
				})
				.where(eq(department.id, id));

			// The replaced swatch is no longer referenced by anything.
			if (swatchImage && current.swatchImage && current.swatchImage !== swatchImage) {
				await removeFile(current.swatchImage);
			}

			return message(form, { type: 'success', text: 'Color Successfully Updated' });
		} catch (err) {
			await removeFile(swatchImage);

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			if (isDuplicateEntry(err)) {
				setError(form, 'name', 'Color name already exists.');
				return message(
					form,
					{ type: 'error', text: 'Color name is already taken. Please choose another one.' },
					{ status: 400 }
				);
			}
			console.error('color edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not update the color.') },
				{ status: 500 }
			);
		}
	}
};
