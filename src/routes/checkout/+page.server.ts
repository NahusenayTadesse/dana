import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, inArray } from 'drizzle-orm';
import { sendEmail, quoteRequestReceivedTemplate, adminNewQuoteRequestTemplate } from '$lib/server/email';

import { SMTP_USER as USER } from '$env/static/private';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { add } from './schema';
import { db } from '$lib/server/db';
import { quoteRequests, orders, orderItems, products, customers } from '$lib/server/db/schema';
import type { PageServerLoad, Actions } from './$types';
import { saveUploadedFile, deleteUploadedFile } from '$lib/server/upload';
import { resolveOrderLines, OrderLineError } from '$lib/server/orderLines';
import { loadBuyProductList } from '$lib/server/buy-listing';

export const load: PageServerLoad = async ({ locals }) => {
	const form = await superValidate(zod4(add));
	const signupForm = await superValidate(zod4(addUser));
	const loginForm = await superValidate(zod4(loginSchema));

	// What the submit will require of a signed-in customer, resolved up front.
	// Without this the page showed a bare "Request quote" button and the action
	// threw "Missing phone number — please update your profile", an error the
	// customer could neither see coming nor act on from this page. The action
	// already falls back to form values, so rendering the gaps as inputs is
	// enough to make those throws unreachable in normal use.
	let profile: { name: string | null; email: string | null; phone: string | null } | null = null;
	if (locals?.user) {
		const row = await db
			.select({ name: customers.name, email: customers.email, phone: customers.phone })
			.from(customers)
			.where(eq(customers.userId, locals.user.id))
			.limit(1)
			.then((rows) => rows[0]);

		profile = {
			name: row?.name ?? locals.user.name ?? null,
			email: row?.email ?? locals.user.email ?? null,
			phone: row?.phone ?? null
		};
	}

	// The manifest here uses the same grouped order blocks as /buy, and those
	// need the variant matrix: without it a block can't offer the colours a
	// product comes in, and length edits lose their catalog stops and min/max
	// clamps — a customer could dial in a length the factory doesn't make.
	const productList = await loadBuyProductList();

	return {
		form,
		signupForm,
		loginForm,
		productList,
		profile,
		missingProfileFields: profile
			? {
					name: !profile.name,
					email: !profile.email,
					phone: !profile.phone
				}
			: null
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

		const { name, email, phone, tinNo, docs, selectedProducts, type } = form.data;

		let customerInfo: { value: number; email: string; name: string; phone: string | null } | undefined;
		let newQuoteId: number | undefined;

		// Resolved outside the try so we can use them in the post-transaction emails too
		let resolvedName: string | undefined;
		let resolvedEmail: string | undefined;
		let resolvedPhone: string | undefined;
		let itemLabel = '';

		// Price/spec resolution happens BEFORE the transaction opens: it only
		// reads, it's the most likely thing to reject the request, and doing it
		// here keeps the write transaction as short as possible.
		let lines;
		try {
			lines = await resolveOrderLines(selectedProducts);
		} catch (err) {
			return message(
				form,
				{
					type: 'error',
					text: err instanceof OrderLineError ? err.message : 'Could not process your cart.'
				},
				{ status: 400 }
			);
		}

		// Uploads are written to disk OUTSIDE the transaction. Doing it inside
		// meant a rollback left an orphaned file on disk with no row pointing at
		// it; here, the file is the thing we clean up if the DB write fails.
		let uploadedDocPath: string | null = null;
		if (docs) {
			try {
				uploadedDocPath = await saveUploadedFile(docs);
			} catch (err) {
				console.error('Quote request document upload failed:', err);
				return message(
					form,
					{ type: 'error', text: 'Could not save your uploaded document. Please try again.' },
					{ status: 500 }
				);
			}
		}

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

					if (!customer) {
						// Signed in, but no customers row was ever created for this
						// user. Previously this fell through with customerInfo
						// undefined and inserted an order with customerId: NULL —
						// an order nobody could look up. Create the profile instead.
						if (!locals.user.email) {
							throw new Error(
								'Your account has no email on file. Add one in Account → Settings, then submit again.'
							);
						}

						const [inserted] = await tx
							.insert(customers)
							.values({
								name: name ?? locals.user.name ?? locals.user.email,
								email: locals.user.email,
								phone,
								tinNo,
								docs: uploadedDocPath,
								type,
								userId: locals.user.id
							})
							.$returningId();

						customerInfo = {
							value: inserted.id,
							name: name ?? locals.user.name ?? locals.user.email,
							email: locals.user.email,
							phone: phone ?? null
						};
					} else {
						customerInfo = customer;

						// A returning customer's uploaded document used to be
						// silently dropped — the save only happened on the
						// brand-new-customer path.
						if (uploadedDocPath) {
							await tx
								.update(customers)
								.set({ docs: uploadedDocPath })
								.where(eq(customers.id, customer.value));
						}
					}
				} else {
					if (!email) {
						throw new Error('Email is required to submit a quote request.');
					}

					const doesCustomerExist = await tx
						.select({
							value: customers.id,
							email: customers.email,
							name: customers.name,
							phone: customers.phone,
						
						})
						.from(customers)
						.where(eq(customers.email, email))
						.limit(1)
						.then((rows) => rows[0]);

					if (doesCustomerExist) {
						customerInfo = doesCustomerExist;

						// See above — a returning customer's document was being
						// discarded without any error surfacing to them.
						if (uploadedDocPath) {
							await tx
								.update(customers)
								.set({ docs: uploadedDocPath })
								.where(eq(customers.id, doesCustomerExist.value));
						}
					} else {
						if (!name) {
							throw new Error('Name is required to submit a quote request.');
						}

						const newCustomer = await tx
							.insert(customers)
							.values({ name, email, phone, tinNo, docs: uploadedDocPath, type })
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

				// Safety net only — the checkout page now renders inputs for whatever
				// is missing from the profile, so these should be unreachable.
				if (!resolvedName) {
					throw new Error(
						'We still need a name for this request. Add one below, or update your profile in Account → Settings.'
					);
				}
				if (!resolvedPhone) {
					throw new Error(
						'We still need a phone number for this request. Add one below, or update your profile in Account → Settings.'
					);
				}

				// --- product names for the notification emails ---
				// Scoped to the products actually in the cart. This used to
				// `.from(products)` with no WHERE — a full table scan, inside the
				// transaction, on every checkout. Existence was already validated
				// by resolveOrderLines() above.
				const productIds = [...new Set(lines.map((l) => l.productId))];
				const productRows = await tx
					.select({ id: products.id, name: products.name })
					.from(products)
					.where(inArray(products.id, productIds));

				const productMap = new Map(productRows.map((p) => [p.id, p]));

				itemLabel = lines
					.map((l) => {
						const name = productMap.get(l.productId)?.name ?? `Product #${l.productId}`;
						const spec = l.amount ? ` (${l.amount})` : '';
						return `${name}${spec} ×${l.quantity}`;
					})
					.join(', ');

				// The whole cart is one order (and one quote request) — not a
				// quote_requests row per product, which made a multi-item cart
				// impossible to reason about as a single negotiation.
				const [order] = await tx
					.insert(orders)
					.values({ customerId: customerInfo?.value, status: 'pending', requestStatus: 'pending' })
					.$returningId();

				// Every priced field here came out of the catalog in
				// resolveOrderLines(), not off the wire.
				await tx.insert(orderItems).values(
					lines.map((l) => ({
						orderId: order.id,
						productId: l.productId,
						variantId: l.variantId,
						quantity: l.quantity,
						amount: l.amount,
						price: l.price,
						priceBasis: l.priceBasis,
						priceIncludesVat: l.priceIncludesVat,
						colorId: l.colorId,
						width: l.width,
						widthUnit: l.widthUnit,
						thickness: l.thickness,
						thicknessUnit: l.thicknessUnit,
						length: l.length,
						lengthUnit: l.lengthUnit
					}))
				);

				const [quote] = await tx
					.insert(quoteRequests)
					.values({
						name: resolvedName!,
						email: resolvedEmail,
						phone: resolvedPhone!,
						customerId: customerInfo?.value,
						orderId: order.id,
						message: `Requested via checkout form (${selectedProducts.length} item${selectedProducts.length === 1 ? '' : 's'}).`,
						status: 'new' as const
					})
					.$returningId();

				newQuoteId = quote.id;
			});
		} catch (err) {
			console.error('Quote request failed:', err);

			// The DB rolled back, so nothing references the uploaded file —
			// remove it rather than leaving it orphaned on disk.
			if (uploadedDocPath) {
				await deleteUploadedFile(uploadedDocPath).catch((cleanupErr) =>
					console.error('Failed to clean up orphaned upload:', cleanupErr)
				);
			}

			return message(
				form,
				{
					type: 'error',
					text: 'Error submitting your request: ' + (err instanceof Error ? err.message : String(err))
				},
				{ status: 500 }
			);
		}

		// --- notify customer + admin that a quote request came in (no payment step yet) ---
		if (newQuoteId != null) {
			if (resolvedEmail) {
				const customerTemplate = quoteRequestReceivedTemplate(newQuoteId, {
					name: resolvedName!,
					quantityEstimate: `${selectedProducts.length} item${selectedProducts.length === 1 ? '' : 's'}`,
					itemLabel
				});
				sendEmail(resolvedEmail, customerTemplate.subject, customerTemplate.html, resolvedPhone).catch((err) =>
					console.error('Email/SMS Error (Customer):', err)
				);
			}

			const adminTemplate = adminNewQuoteRequestTemplate(newQuoteId, {
				name: resolvedName!,
				email: resolvedEmail,
				phone: resolvedPhone!,
				quantityEstimate: `${selectedProducts.length} item${selectedProducts.length === 1 ? '' : 's'}`,
				itemLabel
			});
			sendEmail(USER, adminTemplate.subject, adminTemplate.html).catch((err) =>
				console.error('Email Error (Admin):', err)
			);
		}

		// Redirect rather than returning a success message. Returning one left the
		// customer on /checkout with the cart cleared underneath them, so the page
		// re-rendered into its empty-cart state — "your order is empty, browse the
		// shop" — moments after they submitted. The confirmation page states the
		// reference, what was sent, and what happens next.
		redirect(303, `/checkout/submitted?ref=${newQuoteId ?? ''}`);
	}
};