import { setError, superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, count, eq, ne, sql } from 'drizzle-orm';
import { add, edit, deleteService } from './schema';
import { db } from '$lib/server/db';
import { blog, blogCategories as paymentMethods } from '$lib/server/db/schema';
import { describeDbError, isRowReferenced } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

/**
 * `blog_categories.name` has no unique index, so uniqueness is checked here:
 * trimmed and case-insensitive, ignoring the row being edited.
 */
async function nameTaken(name: string, exceptId?: number) {
	const sameName = sql`lower(trim(${paymentMethods.name})) = ${name.trim().toLowerCase()}`;
	const [hit] = await db
		.select({ id: paymentMethods.id })
		.from(paymentMethods)
		.where(exceptId ? and(sameName, ne(paymentMethods.id, exceptId)) : sameName)
		.limit(1);
	return !!hit;
}

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));
	const deleteForm = await superValidate(zod4(deleteService));

	const allData = await db
		.select({
			id: paymentMethods.id,
			name: paymentMethods.name,
			description: paymentMethods.description
		})
		.from(paymentMethods);

	return {
		form,
		editForm,
		deleteForm,
		allData
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
		const form = await superValidate(request, zod4(add));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { name, description } = form.data;

		try {
			if (await nameTaken(name)) {
				setError(form, 'name', 'Category already exists.');
				return message(
					form,
					{ type: 'error', text: 'A category with that name already exists.' },
					{ status: 400 }
				);
			}

			await db.insert(paymentMethods).values({
				name,
				description
			});

			return message(form, { type: 'success', text: 'Category Successfully Created' });
		} catch (err) {
			console.error('blog category add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add the category.') },
				{ status: 500 }
			);
		}
	},
	edit: async ({ request }) => {
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for Errors' },
				{ status: 400 }
			);
		}

		const { id, name, description } = form.data;

		try {
			if (await nameTaken(name, id)) {
				setError(form, 'name', 'Category already exists.');
				return message(
					form,
					{ type: 'error', text: 'Category name is already taken. Please choose another one.' },
					{ status: 400 }
				);
			}

			const [result] = await db
				.update(paymentMethods)
				.set({ name, description })
				.where(eq(paymentMethods.id, id));

			if (!result.affectedRows) {
				return message(
					form,
					{ type: 'error', text: 'That category no longer exists.' },
					{ status: 404 }
				);
			}

			return message(form, { type: 'success', text: 'Category Successfully Updated' });
		} catch (err) {
			console.error('blog category edit failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not update the category.') },
				{ status: 500 }
			);
		}
	},
	delete: async ({ request }) => {
		const form = await superValidate(request, zod4(deleteService));

		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Nothing to delete.' },
				{ status: 400 }
			);
		}

		const { id } = form.data;

		try {
			// blog_categories has no is_active column, so a category in use can't be
			// deactivated — say why instead of surfacing the FK error.
			const [{ posts }] = await db
				.select({ posts: count() })
				.from(blog)
				.where(eq(blog.categoryId, id));

			if (posts > 0) {
				return message(
					form,
					{
						type: 'error',
						text: `This category is used by ${posts} blog post${posts === 1 ? '' : 's'}. Move ${posts === 1 ? 'it' : 'them'} to another category first.`
					},
					{ status: 400 }
				);
			}

			const [result] = await db.delete(paymentMethods).where(eq(paymentMethods.id, id));

			if (!result.affectedRows) {
				return message(
					form,
					{ type: 'error', text: 'That category no longer exists.' },
					{ status: 404 }
				);
			}

			return message(form, { type: 'success', text: 'Category Successfully Deleted' });
		} catch (err) {
			if (isRowReferenced(err)) {
				return message(
					form,
					{
						type: 'error',
						text: 'This category is used by blog posts. Move them to another category first.'
					},
					{ status: 400 }
				);
			}
			console.error('blog category delete failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Error while deleting category.') },
				{ status: 500 }
			);
		}
	}
};
