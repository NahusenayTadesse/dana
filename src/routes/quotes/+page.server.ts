import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq } from 'drizzle-orm';

import { addUser, loginSchema } from '$lib/ZodSchema';
import { quoteRequest } from './schema';

import { db } from '$lib/server/db';
import {
	quoteRequests,
	products,
	productCategories,
	productVariants,
	colors,
	widths,
	thicknesses,
	lengths,
	customers
} from '$lib/server/db/schema';
import { sendEmail, quoteRequestReceivedTemplate, adminNewQuoteRequestTemplate } from '$lib/server/email';
import { SMTP_USER as USER } from '$env/static/private';
import type { PageServerLoad, Actions } from './$types';
import { saveUploadedFile } from '$lib/server/upload';

export const load: PageServerLoad = async ({ url }) => {
	const productId = Number(url.searchParams.get('productId')) || undefined;
	const variantId = Number(url.searchParams.get('variantId')) || undefined;
	const categoryIdParam = Number(url.searchParams.get('categoryId')) || undefined;

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
			categoryId: categoryIdParam ?? productContext?.categoryId
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
			categoryId,
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

				resolvedName = customerInfo?.name ?? name;
				resolvedEmail = customerInfo?.email ?? email;
				resolvedPhone = customerInfo?.phone ?? phone;

				if (!resolvedName) {
					throw new Error('Missing name for quote request — please update your profile.');
				}
				if (!resolvedPhone) {
					throw new Error('Missing phone number for quote request — please update your profile.');
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
						productId,
						variantId,
						categoryId,
						quantityEstimate,
						message: userMessage,
						status: 'new' as const
					})
					.$returningId();

				newQuoteId = inserted[0]?.id;
			});
		} catch (err) {
			console.error('FULL ERROR', err);
			return message(
				form,
				{
					type: 'error',
					text:
						'Error submitting your request: ' +
						(err instanceof Error ? err.message : String(err))
				},
				{ status: 500 }
			);
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
			sendEmail(resolvedEmail, customerTemplate.subject, customerTemplate.html, resolvedPhone).catch((err) =>
				console.error('Email/SMS Error (Customer):', err)
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
		sendEmail(USER, adminTemplate.subject, adminTemplate.html).catch((err) =>
			console.error('Email Error (Admin):', err)
		);

		return message(form, {
			type: 'success',
			text: "Thanks! Your quote request has been submitted — our team will reach out shortly."
		});
	}
};
