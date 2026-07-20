import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';
// import { sendEmail, customerQuoteTemplate, adminQuoteTemplate } from '$lib/server/email';

import { USER } from '$env/static/private';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { add } from './schema';
import { db } from '$lib/server/db';
import { quoteRequests, products, customers } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { saveUploadedFile } from '$lib/server/upload';

export const load: PageServerLoad = async () => {
	const form = await superValidate(zod4(add));
	const signupForm = await superValidate(zod4(addUser));
	const loginForm = await superValidate(zod4(loginSchema));

	return {
		form,
		signupForm,
		loginForm
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

		const { name, email, phone, tinNo, docs, selectedProducts } = form.data;

		let customerInfo: { value: number; email: string; name: string; phone: string | null } | undefined;
		let newQuoteIds: number[] = [];

		// Resolved outside the try so we can use them in the post-transaction emails too
		let resolvedName: string | undefined;
		let resolvedEmail: string | undefined;
		let resolvedPhone: string | undefined;

		try {
			await db.transaction(async (tx) => {
				// --- find or create the customer ---
				if (locals?.user) {
					const customer = await tx
						.select({
							value: customers.id,
							email: customers.email,
							name: customers.name,
							phone: customers.phone
						})
						.from(customers)
						.where(eq(customers.userId, locals.user.id))
						.limit(1)
						.then((rows) => rows[0]);

					customerInfo = customer;
				} else {
					if (!email) {
						throw new Error('Email is required to submit a quote request.');
					}

					const doesCustomerExist = await tx
						.select({
							value: customers.id,
							email: customers.email,
							name: customers.name,
							phone: customers.phone
						})
						.from(customers)
						.where(eq(customers.email, email))
						.limit(1)
						.then((rows) => rows[0]);

					if (doesCustomerExist) {
						customerInfo = doesCustomerExist;
					} else {
						if (!name) {
							throw new Error('Name is required to submit a quote request.');
						}

						const imageUrl = docs ? await saveUploadedFile(docs) : null;

						const newCustomer = await tx
							.insert(customers)
							.values({ name, email, phone, tinNo, docs: imageUrl })
							.$returningId();

						const inserted = newCustomer[0];
						customerInfo = { value: inserted.id, name, email, phone: phone ?? null };
					}
				}

				// --- resolve the values that actually go on the quote rows ---
				// Prefer what's on file for the customer; fall back to what was
				// just typed into the form (covers the logged-in-user case, where
				// the checkout form has no name/email/phone inputs at all).
				resolvedName = customerInfo?.name ?? name;
				resolvedEmail = customerInfo?.email ?? email;
				resolvedPhone = customerInfo?.phone ?? phone;

				if (!resolvedName) {
					throw new Error('Missing name for quote request — please update your profile.');
				}
				if (!resolvedPhone) {
					throw new Error('Missing phone number for quote request — please update your profile.');
				}

				// --- look up product/category info for the rows + emails ---
				const productIds = selectedProducts.map((p) => Number(p.product));
				const productRows = await tx
					.select({ id: products.id, name: products.name, categoryId: products.categoryId })
					.from(products);

				const productMap = new Map(productRows.map((p) => [p.id, p]));

				const missingProduct = productIds.find((id) => !productMap.has(id));
				if (missingProduct !== undefined) {
					throw new Error(`Product ${missingProduct} no longer exists — please refresh your cart.`);
				}

				// --- one quote_requests row per selected product ---
				const rows = selectedProducts.map((p) => {
					const prod = productMap.get(Number(p.product))!;
					return {
						name: resolvedName!,
						email: resolvedEmail,
						phone: resolvedPhone!,
						customerId: customerInfo?.value,
						productId: Number(p.product),
						categoryId: prod.categoryId,
						quantityEstimate: String(p.quantity ?? p.amount ?? ''),
						message: `Requested via checkout form.${p.amount ? ` Variant: ${p.amount}.` : ''}`,
						status: 'new' as const
					};
				});

				const inserted = await tx.insert(quoteRequests).values(rows).$returningId();
				newQuoteIds = inserted.map((r) => r.id);
			});
		} catch (err) {
			console.error('FULL ERROR', err);

			return message(
				form,
				{
					type: 'error',
					text: 'Error submitting your request: ' + (err instanceof Error ? err.message : String(err))
				},
				{ status: 500 }
			);
		}

		// --- notify customer + admin that a quote request came in (no payment step) ---
		// if (resolvedEmail) {
		// 	sendEmail(
		// 		resolvedEmail,
		// 		customerQuoteTemplate(newQuoteIds, selectedProducts).subject,
		// 		customerQuoteTemplate(newQuoteIds, selectedProducts).html
		// 	).catch((err) => console.error('Email Error (Customer):', err));
		// }

		// sendEmail(
		// 	USER,
		// 	adminQuoteTemplate(newQuoteIds, selectedProducts).subject,
		// 	adminQuoteTemplate(newQuoteIds, selectedProducts).html
		// ).catch((err) => console.error('Email Error (Admin):', err));

		return message(form, {
			type: 'success',
			text: 'Thanks! Your quote request has been submitted — our team will reach out shortly.'
		});
	}
};