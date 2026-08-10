import { error } from '@sveltejs/kit';
import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { eq, desc, inArray, sql } from 'drizzle-orm';

import { addLine, updateLine, deleteLine, saveOffer, sendOffer, decideOrder } from './schema';
import { db } from '$lib/server/db';
import {
	quoteRequests,
	orders,
	orderItems,
	products,
	productVariants,
	variantPrices,
	promoCodes,
	colors,
	widths,
	thicknesses,
	lengths,
	transactions,
	quoteReplies,
	priceOffers,
	staff
} from '$lib/server/db/schema';
import { calculateOrderPricing, type PricingBasis } from '$lib/server/pricing';
import { sendQuotePaymentLink } from '$lib/server/notifications';
import type { Actions, PageServerLoad } from './$types';

const spec = (value: string | number | null, unit: string | null) =>
	value != null ? `${Number(value)}${unit === 'gauge' ? 'ga' : unit}` : null;

export const load: PageServerLoad = async ({ params }) => {
	const quoteId = Number(params.id);
	if (!Number.isInteger(quoteId)) error(404, 'Not found.');

	const quote = await db
		.select()
		.from(quoteRequests)
		.where(eq(quoteRequests.id, quoteId))
		.then((rows) => rows[0]);

	const order = quote?.orderId
		? await db.select().from(orders).where(eq(orders.id, quote.orderId)).then((rows) => rows[0])
		: null;

	const items = order
		? await db
				.select({
					id: orderItems.id,
					productId: orderItems.productId,
					productName: products.name,
					variantId: orderItems.variantId,
					quantity: orderItems.quantity,
					length: orderItems.length,
					lengthUnit: orderItems.lengthUnit,
					thickness: orderItems.thickness,
					thicknessUnit: orderItems.thicknessUnit,
					width: orderItems.width,
					widthUnit: orderItems.widthUnit,
					weight: orderItems.weight,
					weightUnit: orderItems.weightUnit,
					colorId: orderItems.colorId,
					colorName: colors.name,
					priceBasis: orderItems.priceBasis,
					price: orderItems.price,
					priceIncludesVat: orderItems.priceIncludesVat
				})
				.from(orderItems)
				.leftJoin(products, eq(products.id, orderItems.productId))
				.leftJoin(colors, eq(colors.id, orderItems.colorId))
				.where(eq(orderItems.orderId, order.id))
		: [];

	const offers = order
		? await db
				.select()
				.from(priceOffers)
				.where(eq(priceOffers.orderId, order.id))
				.orderBy(desc(priceOffers.revision))
		: [];

	const replies = await db
		.select()
		.from(quoteReplies)
		.where(eq(quoteReplies.quoteRequestId, quoteId))
		.orderBy(desc(quoteReplies.createdAt));

	const productList = await db.select({ value: products.id, name: products.name }).from(products);

	const variantRows = await db
		.select({
			id: productVariants.id,
			productId: productVariants.productId,
			sku: productVariants.sku,
			colorName: colors.name,
			width: widths.value,
			widthUnit: widths.unit,
			thickness: thicknesses.value,
			thicknessUnit: thicknesses.unit,
			length: lengths.value,
			lengthUnit: lengths.unit
		})
		.from(productVariants)
		.leftJoin(colors, eq(colors.id, productVariants.colorId))
		.leftJoin(widths, eq(widths.id, productVariants.widthId))
		.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
		.leftJoin(lengths, eq(lengths.id, productVariants.lengthId));

	const variantList = variantRows.map((v) => ({
		value: v.id,
		productId: v.productId,
		name:
			[v.sku, v.colorName, spec(v.width, v.widthUnit), spec(v.thickness, v.thicknessUnit), spec(v.length, v.lengthUnit)]
				.filter(Boolean)
				.join(' · ') || `Variant #${v.id}`
	}));

	const variantIds = variantRows.map((v) => v.id);
	const rateRows = variantIds.length
		? await db.select().from(variantPrices).where(inArray(variantPrices.variantId, variantIds))
		: [];
	const ratesByVariant: Record<number, typeof rateRows> = {};
	for (const r of rateRows) {
		(ratesByVariant[r.variantId] ??= []).push(r);
	}

	const colorList = await db.select({ value: colors.id, name: colors.name }).from(colors);

	const promoCodeList = await db.select().from(promoCodes).where(eq(promoCodes.isActive, true));

	const addLineForm = await superValidate(zod4(addLine));
	const updateLineForm = await superValidate(zod4(updateLine));
	const deleteLineForm = await superValidate(zod4(deleteLine));
	const saveOfferForm = await superValidate(zod4(saveOffer));
	const sendOfferForm = await superValidate(zod4(sendOffer));
	const decideForm = await superValidate(zod4(decideOrder));

	return {
		quote,
		order,
		items,
		offers,
		replies,
		productList,
		variantList,
		ratesByVariant,
		colorList,
		promoCodeList,
		addLineForm,
		updateLineForm,
		deleteLineForm,
		saveOfferForm,
		sendOfferForm,
		decideForm
	};
};

async function resolveStaffId(userId: string | undefined) {
	if (!userId) return null;
	const row = await db.select({ id: staff.id }).from(staff).where(eq(staff.userId, userId)).then((r) => r[0]);
	return row?.id ?? null;
}

export const actions: Actions = {
	startOrder: async ({ params, locals }) => {
		const quoteId = Number(params.id);
		const quote = await db.select().from(quoteRequests).where(eq(quoteRequests.id, quoteId)).then((r) => r[0]);
		if (!quote) return fail(404);
		if (quote.orderId) return { started: true };

		try {
			const [order] = await db
				.insert(orders)
				.values({
					customerId: quote.customerId,
					status: 'pending',
					requestStatus: 'pending',
					createdBy: locals?.user?.id
				})
				.$returningId();

			await db.update(quoteRequests).set({ orderId: order.id }).where(eq(quoteRequests.id, quoteId));
			return { started: true };
		} catch (err) {
			console.error('Start order failed:', err);
			return fail(500);
		}
	},

	addLine: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(addLine));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the line.' }, { status: 400 });

		const { orderId, basis, unitPrice, ...rest } = form.data;
		try {
			await db.insert(orderItems).values({
				orderId,
				productId: rest.productId,
				variantId: rest.variantId,
				quantity: rest.quantity,
				length: rest.length != null ? String(rest.length) : null,
				lengthUnit: rest.lengthUnit,
				thickness: rest.thickness != null ? String(rest.thickness) : null,
				thicknessUnit: rest.thicknessUnit,
				width: rest.width != null ? String(rest.width) : null,
				widthUnit: rest.widthUnit,
				weight: rest.weight != null ? String(rest.weight) : null,
				weightUnit: rest.weightUnit,
				colorId: rest.colorId,
				priceBasis: basis,
				price: String(unitPrice),
				priceIncludesVat: rest.priceIncludesVat,
				amount: basis,
				createdBy: locals?.user?.id
			});
			return message(form, { type: 'success', text: 'Line added.' });
		} catch (err) {
			console.error('Add line failed:', err);
			return message(form, { type: 'error', text: 'Error adding line.' }, { status: 500 });
		}
	},

	updateLine: async ({ request }) => {
		const form = await superValidate(request, zod4(updateLine));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the line.' }, { status: 400 });

		const { id, orderId, basis, unitPrice, ...rest } = form.data;
		try {
			await db
				.update(orderItems)
				.set({
					productId: rest.productId,
					variantId: rest.variantId,
					quantity: rest.quantity,
					length: rest.length != null ? String(rest.length) : null,
					lengthUnit: rest.lengthUnit,
					thickness: rest.thickness != null ? String(rest.thickness) : null,
					thicknessUnit: rest.thicknessUnit,
					width: rest.width != null ? String(rest.width) : null,
					widthUnit: rest.widthUnit,
					weight: rest.weight != null ? String(rest.weight) : null,
					weightUnit: rest.weightUnit,
					colorId: rest.colorId,
					priceBasis: basis,
					price: String(unitPrice),
					priceIncludesVat: rest.priceIncludesVat,
					amount: basis
				})
				.where(eq(orderItems.id, id));
			return message(form, { type: 'success', text: 'Line updated.' });
		} catch (err) {
			console.error('Update line failed:', err);
			return message(form, { type: 'error', text: 'Error updating line.' }, { status: 500 });
		}
	},

	deleteLine: async ({ request }) => {
		const form = await superValidate(request, zod4(deleteLine));
		if (!form.valid) return fail(400);

		try {
			await db.delete(orderItems).where(eq(orderItems.id, form.data.id));
			return message(form, { type: 'success', text: 'Line removed.' });
		} catch (err) {
			console.error('Delete line failed:', err);
			return message(form, { type: 'error', text: 'Error removing line.' }, { status: 500 });
		}
	},

	saveOffer: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(saveOffer));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the offer.' }, { status: 400 });

		const { orderId, discountPercentage, promoCodeId, paymentTerms, validityDays, advancePaymentPercentage } =
			form.data;

		try {
			const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
			if (lines.length === 0) {
				return message(form, { type: 'error', text: 'Add at least one line before saving an offer.' }, { status: 400 });
			}

			let effectiveDiscount = discountPercentage ?? 0;
			if (promoCodeId) {
				const promo = await db.select().from(promoCodes).where(eq(promoCodes.id, promoCodeId)).then((r) => r[0]);
				if (!promo || !promo.isActive) {
					return message(form, { type: 'error', text: 'Promo code is not active.' }, { status: 400 });
				}
				const now = new Date();
				if (promo.startsAt && now < promo.startsAt) {
					return message(form, { type: 'error', text: 'Promo code is not active yet.' }, { status: 400 });
				}
				if (promo.expiresAt && now > promo.expiresAt) {
					return message(form, { type: 'error', text: 'Promo code has expired.' }, { status: 400 });
				}
				if (promo.maxUses != null && promo.timesUsed >= promo.maxUses) {
					return message(form, { type: 'error', text: 'Promo code has reached its usage limit.' }, { status: 400 });
				}
				// Promo stacks with (doesn't replace) a sales-person discount.
				effectiveDiscount += Number(promo.discountPercentage);
			}

			const pricing = calculateOrderPricing({
				lines: lines.map((l) => ({
					quantity: l.quantity,
					length: l.length != null ? Number(l.length) : null,
					width: l.width != null ? Number(l.width) : null,
					thickness: l.thickness != null ? Number(l.thickness) : null,
					weight: l.weight != null ? Number(l.weight) : null,
					basis: l.priceBasis as PricingBasis,
					unitPrice: Number(l.price ?? 0),
					priceIncludesVat: l.priceIncludesVat
				})),
				discountPercentage: effectiveDiscount
			});

			const staffId = await resolveStaffId(locals?.user?.id);

			const existing = await db
				.select({ revision: priceOffers.revision })
				.from(priceOffers)
				.where(eq(priceOffers.orderId, orderId))
				.orderBy(desc(priceOffers.revision))
				.limit(1);
			const nextRevision = (existing[0]?.revision ?? 0) + 1;

			const [inserted] = await db
				.insert(priceOffers)
				.values({
					orderId,
					revision: nextRevision,
					staffId,
					subtotal: String(pricing.subtotal),
					discountPercentage: String(effectiveDiscount),
					discountAmount: String(pricing.discountAmount),
					promoCodeId: promoCodeId ?? null,
					priceExcludingVat: String(pricing.priceExcludingVat),
					vatRate: String(pricing.vatRate),
					vatAmount: String(pricing.vatAmount),
					priceIncludingVat: String(pricing.priceIncludingVat),
					withholdingRate: String(pricing.withholdingRate),
					withholdingAmount: String(pricing.withholdingAmount),
					total: String(pricing.total),
					paymentTerms: paymentTerms ?? null,
					validityDays: validityDays ?? null,
					advancePaymentPercentage: String(advancePaymentPercentage),
					createdBy: locals?.user?.id
				})
				.$returningId();

			if (promoCodeId) {
				await db
					.update(promoCodes)
					.set({ timesUsed: sql`${promoCodes.timesUsed} + 1` })
					.where(eq(promoCodes.id, promoCodeId));
			}

			return message(form, {
				type: 'success',
				text: `Offer revision ${nextRevision} saved. Total: ${pricing.total.toLocaleString()} ETB.`
			});
		} catch (err) {
			console.error('Save offer failed:', err);
			return message(form, { type: 'error', text: 'Error saving the offer.' }, { status: 500 });
		}
	},

	sendOffer: async ({ request, url }) => {
		const form = await superValidate(request, zod4(sendOffer));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { priceOfferId, subject, message: emailMessage } = form.data;

		try {
			const offer = await db.select().from(priceOffers).where(eq(priceOffers.id, priceOfferId)).then((r) => r[0]);
			if (!offer) return message(form, { type: 'error', text: 'Offer not found.' }, { status: 404 });

			const order = await db.select().from(orders).where(eq(orders.id, offer.orderId)).then((r) => r[0]);
			if (!order) return message(form, { type: 'error', text: 'Order not found.' }, { status: 404 });

			const quote = await db
				.select()
				.from(quoteRequests)
				.where(eq(quoteRequests.orderId, offer.orderId))
				.then((r) => r[0]);

			let transactionId = order.transactionId;
			if (transactionId) {
				await db.update(transactions).set({ amount: String(offer.total) }).where(eq(transactions.id, transactionId));
			} else {
				const [txn] = await db
					.insert(transactions)
					.values({ amount: String(offer.total), paymentStatus: 'pending' })
					.$returningId();
				transactionId = txn.id;
				await db.update(orders).set({ transactionId }).where(eq(orders.id, order.id));
			}

			let quoteRequestId = quote?.id;
			if (!quoteRequestId) {
				return message(form, { type: 'error', text: 'No quote request linked to this order.' }, { status: 400 });
			}

			await db.insert(quoteReplies).values({
				quoteRequestId,
				subject,
				message: emailMessage,
				priceOfferId,
				orderId: order.id
			});

			await db.update(quoteRequests).set({ status: 'quoted' }).where(eq(quoteRequests.id, quoteRequestId));

			await sendQuotePaymentLink(order.id, url.origin);

			return message(form, { type: 'success', text: 'Priced offer sent to customer.' });
		} catch (err) {
			console.error('Send offer failed:', err);
			return message(
				form,
				{ type: 'error', text: 'Error sending offer: ' + (err instanceof Error ? err.message : String(err)) },
				{ status: 500 }
			);
		}
	},

	approveOrder: async ({ request }) => {
		const form = await superValidate(request, zod4(decideOrder));
		if (!form.valid) return fail(400, { form });

		try {
			await db.update(orders).set({ requestStatus: 'approved' }).where(eq(orders.id, form.data.orderId));
			return message(form, { type: 'success', text: 'Order approved — now in the build queue.' });
		} catch {
			return message(form, { type: 'error', text: 'Error approving order.' }, { status: 500 });
		}
	},

	rejectOrder: async ({ request }) => {
		const form = await superValidate(request, zod4(decideOrder));
		if (!form.valid) return fail(400, { form });

		try {
			await db.update(orders).set({ requestStatus: 'rejected' }).where(eq(orders.id, form.data.orderId));
			return message(form, { type: 'success', text: 'Order rejected.' });
		} catch {
			return message(form, { type: 'error', text: 'Error rejecting order.' }, { status: 500 });
		}
	}
};

