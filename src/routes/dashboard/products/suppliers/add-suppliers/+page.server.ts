import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { add } from '../schema';
import { db } from '$lib/server/db';
import { productSuppliers as supplySuppliers } from '$lib/server/db/schema';
import { describeDbError } from '$lib/server/dbErrors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));

	return {
		form
	};
};

// Editing lives on the [id] route; this page only adds.
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

		const { name, phone, email, description, status } = form.data;

		try {
			await db.insert(supplySuppliers).values({
				name,
				phone,
				email: email || null,
				description: description || null,
				isActive: status,
				createdBy: locals?.user?.id
			});

			return message(form, { type: 'success', text: 'Supplier Successfully Added' });
		} catch (err) {
			console.error('supplier add failed', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not add the supplier.') },
				{ status: 500 }
			);
		}
	}
};
