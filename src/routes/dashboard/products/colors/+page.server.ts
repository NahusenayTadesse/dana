import { setError, superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { add, edit } from './schema';
import { db } from '$lib/server/db';
import { colors as department } from '$lib/server/db/schema';
import type { Actions } from './$types';
import type { PageServerLoad } from './$types.js';
import { saveUploadedFile } from '$lib/server/upload.js';

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
			return message(form, { type: 'error', text: 'Please check the form for Errors' }, { status: 400 });
		}

		const { name, code, hexValue, image } = form.data;

		try {

			const swatchImage = image ? await saveUploadedFile(image) : null;
			await db.transaction(async (tx) => {
				await tx.insert(department).values({
					name,
					code, hexValue, swatchImage,
					createdBy: locals?.user?.id
				});
			});

			return message(form, { type: 'success', text: 'Color Successfully Added' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') setError(form, 'name', 'Color already exists.');
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Color is already exists. Please choose another one.'
						: err.message
			});
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for Errors' }, { status: 400 });
		}

		const { id, name, code, hexValue, image } = form.data;
		const swatchImage = image ? await saveUploadedFile(image) : null;


		try {
			await db
				.update(department)
				.set({
					name,
				code, hexValue,
				swatchImage: swatchImage ? swatchImage : undefined,
					updatedBy: locals?.user?.id
				})
				.where(eq(department.id, Number(id)));
			return message(form, { type: 'success', text: 'Color Successfully Updated' });
		} catch (err: any) {
			if (err.code === 'ER_DUP_ENTRY') return;
			setError(form, 'name', 'Color name already exists.');
			return message(form, {
				type: 'error',
				text:
					err.code === 'ER_DUP_ENTRY'
						? 'Color name is already taken. Please choose another one.'
						: err.message
			});
		}
	}
};
