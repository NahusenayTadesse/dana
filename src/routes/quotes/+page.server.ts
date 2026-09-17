import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { quoteRequest } from './schema';

import { db } from '$lib/server/db';
import {
	quoteRequests,
	orders,
	orderItems,
	products,
	productCategories,
	productVariants,
	colors,
	widths,
	thicknesses,
	lengths,
	customers
} from '$lib/server/db/schema';
import {
	sendEmail,
	quoteRequestReceivedTemplate,
	adminNewQuoteRequestTemplate,
	quoteRequestReceivedSms,
	sendSmsToEthPhone
} from '$lib/server/email';
import { alertsRecipient } from '$lib/server/notifications';
import type { PageServerLoad, Actions } from './$types';
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { isDuplicateEntry } from '$lib/server/dbErrors';

/** A problem the visitor can fix; its message is safe to show them. */
class QuoteFormError extends Error {}

export const load: PageServerLoad = async ({ url }) => {
	const productId = Number(url.searchParams.get('productId')) || undefined;
	const variantId = Number(url.searchParams.get('variantId')) || undefined;
	const categoryIdParam = Number(url.searchParams.get('categoryId')) || undefined;
	// Prefilled context from a custom spec configured on the product page (e.g.
	// a cut-to-order length beyond the catalog) — just a note for staff, the
	// exact spec gets captured properly when they build the order.
	const note = url.searchParams.get('note') ?? undefined;

	// Display-only context — what actually gets submitted comes from the hidden form fields
	let productContext = null;
	if (productId) {
		productContext = await db
			.select({
				id: products.id,
				name: products.name,
				slug: products.slug,
				featuredImage: products.featuredImage,
				categoryId: products.categoryId,
				categoryName: productCategories.name
			})
			.from(products)
			.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
			.where(eq(products.id, productId))
			.then((rows) => rows[0] ?? null);
	}

	let variantContext = null;
	if (variantId) {
		variantContext = await db
			.select({
				id: productVariants.id,
				sku: productVariants.sku,
				imageUrl: productVariants.imageUrl,
				colorName: colors.name,
				colorHex: colors.hexValue,
				widthValue: widths.value,
				widthUnit: widths.unit,
				widthLabel: widths.label,
				thicknessValue: thicknesses.value,
				thicknessUnit: thicknesses.unit,
				lengthValue: lengths.value,
				lengthUnit: lengths.unit,
				lengthLabel: lengths.label,
				isCustomLength: lengths.isCustom
			})
			.from(productVariants)
			.leftJoin(colors, eq(colors.id, productVariants.colorId))
			.leftJoin(widths, eq(widths.id, productVariants.widthId))
			.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
			.leftJoin(lengths, eq(lengths.id, productVariants.lengthId))
			.where(eq(productVariants.id, variantId))
			.then((rows) => rows[0] ?? null);
	}

	const form = await superValidate(
		{
			productId,
			variantId,
			categoryId: categoryIdParam ?? productContext?.categoryId,
			message: note
		},
		zod4(quoteRequest)
	);
	const signupForm = await superValidate(zod4(addUser));
	const loginForm = await superValidate(zod4(loginSchema));

	return { form, signupForm, loginForm, productContext, variantContext };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(quoteRequest));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		const {
			name,
			email,
			phone,
			whatsapp,
			companyName,
			tinNo,
			docs,
			productId,
			variantId,
			quantityEstimate,
			message: userMessage
		} = form.data;

		let customerInfo:
			| { value: number; email: string; name: string; phone: string | null }
			| undefined;
		let resolvedName: string | undefined;
		let resolvedEmail: string | undefined;
		let resolvedPhone: string | undefined;
		let newQuoteId: number | undefined;
		// Files saved inside the transaction — removed again if it rolls back.
		const savedFiles: string[] = [];
		const saveDocs = async (file: File) => {
			const stored = await saveUploadedFile(file);
			savedFiles.push(stored);
			return stored;
		};

		try {
			await db.transaction(async (tx) => {
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
						// Signed in, but no customers row is linked to this user — so
						// `customerInfo` stayed undefined and both the order and the
						// quote request were written with a NULL customerId. That is the
						// state the dashboard can price but never send:
						// sendQuotePaymentLink reads the address off the customer row,
						// and /pay/[token] refuses to render without one.
						if (!locals.user.email) {
							throw new QuoteFormError(
								'Your account has no email on file. Add one in Account → Settings, then submit again.'
							);
						}

						// A guest quote made before signing up already created a
						// customers row with this email. Inserting another one hit the
						// unique email index and failed the whole request, so link that
						// row to the account instead.
						const byEmail = await tx
							.select({
								value: customers.id,
								email: customers.email,
								name: customers.name,
								phone: customers.phone,
								userId: customers.userId
							})
							.from(customers)
							.where(eq(customers.email, locals.user.email))
							.limit(1)
							.then((rows) => rows[0]);

						if (byEmail) {
							if (byEmail.userId && byEmail.userId !== locals.user.id) {
								throw new QuoteFormError(
									'Your email is already linked to another account. Please contact us so we can sort it out.'
								);
							}
							await tx
								.update(customers)
								.set({ userId: locals.user.id, phone: byEmail.phone ?? phone ?? null })
								.where(eq(customers.id, byEmail.value));
							customerInfo = {
								value: byEmail.value,
								email: byEmail.email,
								name: byEmail.name,
								phone: byEmail.phone ?? phone ?? null
							};
						} else {
							const resolvedDocs = docs ? await saveDocs(docs) : null;

							const [inserted] = await tx
								.insert(customers)
								.values({
									name: name ?? locals.user.name ?? locals.user.email,
									email: locals.user.email,
									phone,
									tinNo,
									docs: resolvedDocs,
									userId: locals.user.id
								})
								.$returningId();

							customerInfo = {
								value: inserted.id,
								name: name ?? locals.user.name ?? locals.user.email,
								email: locals.user.email,
								phone: phone ?? null
							};
						}
					} else {
						customerInfo = customer;
					}
				} else {
					if (!email) {
						throw new QuoteFormError('Email is required to submit a quote request.');
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
							throw new QuoteFormError('Name is required to submit a quote request.');
						}

						const imageUrl = docs ? await saveDocs(docs) : null;

						const newCustomer = await tx
							.insert(customers)
							.values({ name, email, phone, tinNo, docs: imageUrl })
							.$returningId();

						const inserted = newCustomer[0];
						customerInfo = { value: inserted.id, name, email, phone: phone ?? null };
					}
				}

				resolvedName = customerInfo?.name ?? name;
				resolvedEmail = customerInfo?.email ?? email;
				resolvedPhone = customerInfo?.phone ?? phone;

				if (!resolvedName) {
					throw new QuoteFormError('Missing name for quote request — please update your profile.');
				}
				if (!resolvedPhone) {
					throw new QuoteFormError('Missing phone number for quote request — please update your profile.');
				}

				// Every quote is for a whole order now, not a single product row —
				// create the order (and its one line, if a product was specified)
				// up front so the dashboard's quote builder has something to work
				// with immediately.
				let newOrderId: number | undefined;
				if (productId) {
					const [order] = await tx
						.insert(orders)
						.values({ customerId: customerInfo?.value, status: 'pending', requestStatus: 'pending' })
						.$returningId();
					newOrderId = order.id;

					await tx.insert(orderItems).values({
						orderId: newOrderId,
						productId,
						variantId: variantId ?? null,
						quantity: quantityEstimate ? Number(quantityEstimate) || null : null,
						amount: quantityEstimate ?? 'quote requested'
					});
				}

				const inserted = await tx
					.insert(quoteRequests)
					.values({
						name: resolvedName!,
						email: resolvedEmail,
						phone: resolvedPhone!,
						whatsapp,
						companyName,
						customerId: customerInfo?.value,
						orderId: newOrderId,
						message: userMessage,
						status: 'new' as const
					})
					.$returningId();

				newQuoteId = inserted[0]?.id;
			});
		} catch (err) {
			console.error('Quote request failed:', err);
			await Promise.all(savedFiles.map((file) => deleteUploadedFile(file).catch(() => {})));

			// Only messages written for the visitor are shown — a database error's
			// message is the raw SQL statement with their submitted details in it.
			const known = err instanceof QuoteFormError || err instanceof UploadError;
			const text = known
				? err.message
				: isDuplicateEntry(err)
					? 'We already have a customer record with these details. Please sign in, or contact us.'
					: 'Something went wrong submitting your request. Please try again.';
			return message(form, { type: 'error', text: `Error submitting your request: ${text}` }, { status: known ? 400 : 500 });
		}

		// --- resolve a human-readable item label for the notification emails ---
		let itemLabel = 'General inquiry';
		try {
			let productName: string | null = null;
			let categoryName: string | null = null;
			if (productId) {
				const p = await db
					.select({ name: products.name, categoryName: productCategories.name })
					.from(products)
					.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
					.where(eq(products.id, productId))
					.then((rows) => rows[0]);
				productName = p?.name ?? null;
				categoryName = p?.categoryName ?? null;
			}

			let variant:
				| {
						colorName: string | null;
						widthValue: string | null;
						widthUnit: string | null;
						widthLabel: string | null;
						thicknessValue: string | null;
						thicknessUnit: string | null;
						lengthValue: string | null;
						lengthUnit: string | null;
						lengthLabel: string | null;
						isCustomLength: boolean | null;
				  }
				| undefined;
			if (variantId) {
				variant = await db
					.select({
						colorName: colors.name,
						widthValue: widths.value,
						widthUnit: widths.unit,
						widthLabel: widths.label,
						thicknessValue: thicknesses.value,
						thicknessUnit: thicknesses.unit,
						lengthValue: lengths.value,
						lengthUnit: lengths.unit,
						lengthLabel: lengths.label,
						isCustomLength: lengths.isCustom
					})
					.from(productVariants)
					.leftJoin(colors, eq(colors.id, productVariants.colorId))
					.leftJoin(widths, eq(widths.id, productVariants.widthId))
					.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
					.leftJoin(lengths, eq(lengths.id, productVariants.lengthId))
					.where(eq(productVariants.id, variantId))
					.then((rows) => rows[0]);
			}

			if (productName) {
				const specParts: string[] = [];
				if (variant?.colorName) specParts.push(variant.colorName);
				const widthPart =
					variant?.widthLabel || (variant?.widthValue ? `${variant.widthValue}${variant.widthUnit ?? ''}` : null);
				if (widthPart) specParts.push(widthPart);
				const thicknessPart = variant?.thicknessValue
					? `${variant.thicknessValue}${variant.thicknessUnit ?? ''}`
					: null;
				if (thicknessPart) specParts.push(thicknessPart);
				const lengthPart =
					variant?.lengthLabel || (variant?.lengthValue ? `${variant.lengthValue}${variant.lengthUnit ?? ''}` : null);
				if (lengthPart) specParts.push(variant?.isCustomLength ? `${lengthPart} (cut to order)` : lengthPart);

				itemLabel = specParts.length ? `${productName} (${specParts.join(' · ')})` : productName;
			} else if (categoryName) {
				itemLabel = `General inquiry — ${categoryName} category`;
			}
		} catch (err) {
			console.error('Could not resolve product/variant details for quote notification:', err);
		}

		// --- notify customer + admin (fire-and-forget — the quote request is already saved) ---
		const customerTemplate = quoteRequestReceivedTemplate(newQuoteId!, {
			name: resolvedName!,
			companyName,
			quantityEstimate,
			message: userMessage,
			itemLabel
		});
		if (resolvedEmail) {
			sendEmail(
				resolvedEmail,
				customerTemplate.subject,
				customerTemplate.html,
				resolvedPhone,
				quoteRequestReceivedSms(newQuoteId!, itemLabel)
			).catch((err) => console.error('Email/SMS Error (Customer):', err));
		} else if (resolvedPhone) {
			// No email on file — the SMS is the only acknowledgement they get.
			sendSmsToEthPhone(resolvedPhone, quoteRequestReceivedSms(newQuoteId!, itemLabel)).catch((err) =>
				console.error('SMS Error (Customer):', err)
			);
		}

		const adminTemplate = adminNewQuoteRequestTemplate(newQuoteId!, {
			name: resolvedName!,
			email: resolvedEmail,
			phone: resolvedPhone!,
			whatsapp,
			companyName,
			quantityEstimate,
			message: userMessage,
			itemLabel
		});
		// Business Settings → "Send order and quote alerts to". Hardcoding
		// SMTP_USER meant the one notification that setting explicitly names
		// ignored it, silently.
		alertsRecipient()
			.then((to) => sendEmail(to, adminTemplate.subject, adminTemplate.html))
			.catch((err) => console.error('Email Error (Admin):', err));

		return message(form, {
			type: 'success',
			text: "Thanks! Your quote request has been submitted — our team will reach out shortly."
		});
	}
};
