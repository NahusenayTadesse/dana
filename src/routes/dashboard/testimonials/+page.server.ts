import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { addTestimonial, editTestimonial, deleteTestimonial } from './schema.js';
import { db } from '$lib/server/db';
import { testimonials, user } from '$lib/server/db/schema';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { describeDbError } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types.js';

/** Best-effort removal — a failed unlink must never fail the request. */
const removeFile = (name: string | null | undefined) =>
	name ? deleteUploadedFile(name).catch(() => {}) : Promise.resolve();

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(addTestimonial));
	const editForm = await superValidate(zod4(editTestimonial));
	const deleteForm = await superValidate(zod4(deleteTestimonial));

	const allTestimonials = await db
		.select({
			id: testimonials.id,
			name: testimonials.name,
			position: testimonials.position,
			testimonial: testimonials.message,
			avatar: testimonials.avatar,
			isApproved: testimonials.isApproved,
			createdBy: user.name,
			createdById: testimonials.createdBy
		})
		.from(testimonials)
		.leftJoin(user, eq(user.id, testimonials.createdBy));

	return {
		form,
		editForm,
		deleteForm,
		allTestimonials
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addTestimonial));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { name, position, testimonial, avatar, isApproved } = form.data;
		let avatarFile: string | null = null;

		try {
			avatarFile = await saveUploadedFile(avatar);
			await db.insert(testimonials).values({
				name,
				position: position || null,
				message: testimonial,
				avatar: avatarFile,
				isApproved,
				createdBy: locals.user?.id
			});

			return message(form, { type: 'success', text: 'Testimonial Successfully Created' });
		} catch (err) {
			await removeFile(avatarFile);

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('testimonial add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Error while creating testimonial.') },
				{ status: 500 }
			);
		}
	},
	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(editTestimonial));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { id, name, position, testimonial, avatar, isApproved } = form.data;
		let avatarFile: string | null = null;

		try {
			const [current] = await db
				.select({ avatar: testimonials.avatar })
				.from(testimonials)
				.where(eq(testimonials.id, id))
				.limit(1);

			if (!current) {
				return message(
					form,
					{ type: 'error', text: 'That testimonial no longer exists.' },
					{ status: 404 }
				);
			}

			// Keep the current avatar unless a new one was chosen.
			avatarFile = avatar?.size ? await saveUploadedFile(avatar) : null;

			await db
				.update(testimonials)
				.set({
					name,
					// A cleared position arrives as undefined — store NULL so it is removed.
					position: position || null,
					message: testimonial,
					isApproved,
					...(avatarFile ? { avatar: avatarFile } : {}),
					updatedBy: locals?.user?.id
				})
				.where(eq(testimonials.id, id));

			if (avatarFile && current.avatar !== avatarFile) {
				await removeFile(current.avatar);
			}

			return message(form, { type: 'success', text: 'Testimonial Successfully Updated' });
		} catch (err) {
			await removeFile(avatarFile);

			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('testimonial edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Error while updating testimonial.') },
				{ status: 500 }
			);
		}
	},
	delete: async ({ request }) => {
		const form = await superValidate(request, zod4(deleteTestimonial));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Nothing to delete.' }, { status: 400 });
		}

		const { id } = form.data;

		try {
			const [current] = await db
				.select({ avatar: testimonials.avatar })
				.from(testimonials)
				.where(eq(testimonials.id, id))
				.limit(1);

			if (!current) {
				return message(
					form,
					{ type: 'error', text: 'That testimonial no longer exists.' },
					{ status: 404 }
				);
			}

			await db.delete(testimonials).where(eq(testimonials.id, id));
			await removeFile(current.avatar);

			return message(form, { type: 'success', text: 'Testimonial Successfully Deleted' });
		} catch (err) {
			console.error('testimonial delete failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Error while deleting testimonial.') },
				{ status: 500 }
			);
		}
	}
};
