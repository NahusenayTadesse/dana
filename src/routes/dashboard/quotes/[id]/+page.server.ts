import { error } from '@sveltejs/kit';
import { superValidate, message, fail } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, asc, desc, eq, gt, inArray, isNull, lt, ne, or, sql } from 'drizzle-orm';

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
import { NotificationError, sendQuotePaymentLink } from '$lib/server/notifications';
import { ensureQuoteCustomer } from '$lib/server/quoteCustomers';
import { getSiteSettings } from '$lib/server/siteSettings';
import { vatRateOf } from '$lib/siteSettings';
import { parseIdParam } from '$lib/server/params';
import type { DbLike } from '$lib/server/stock';
import type { Actions, PageServerLoad } from './$types';

type Order = typeof orders.$inferSelect;
type OrderLine = typeof orderItems.$inferSelect;
type Offer = typeof priceOffers.$inferSelect;
type Txn = Pick<typeof transactions.$inferSelect, 'id' | 'amountPaid' | 'txnRef' | 'settledTxnRef'>;

const spec = (value: string | number | null, unit: string | null) =>
	value != null ? `${Number(value)}${unit === 'gauge' ? 'ga' : unit}` : null;

// ── Order state ─────────────────────────────────────────────────────────────

/**
 * The quote at `params.id` and the order it owns. Every action resolves its
 * order through here instead of trusting a posted `orderId`, so a form can
 * never reach into another quote's order.
 */
async function loadQuoteContext(paramId: string) {
	const quoteId = parseIdParam(paramId);
	const quote = await db
		.select()
		.from(quoteRequests)
		.where(eq(quoteRequests.id, quoteId))
		.then((rows) => rows[0]);
	if (!quote) error(404, 'Quote request not found.');

	const order = quote.orderId
		? await db.select().from(orders).where(eq(orders.id, quote.orderId)).then((rows) => rows[0])
		: undefined;

	const transaction = order?.transactionId ? await loadTransaction(db, order.transactionId) : undefined;

	return { quoteId, quote, order, transaction };
}

async function loadTransaction(tx: DbLike, transactionId: number): Promise<Txn | undefined> {
	return tx
		.select({
			id: transactions.id,
			amountPaid: transactions.amountPaid,
			txnRef: transactions.txnRef,
			settledTxnRef: transactions.settledTxnRef
		})
		.from(transactions)
		.where(eq(transactions.id, transactionId))
		.then((rows) => rows[0]);
}

const paidTowards = (transaction: Txn | undefined) => Number(transaction?.amountPaid ?? 0);

/**
 * Why this order's lines and offers can no longer change, or null if they can.
 * Once staff have decided the order, or any money has come in, editing a line
 * would silently change what the customer owes against what they agreed to.
 */
function lockReason(order: Order, transaction: Txn | undefined): string | null {
	if (order.status === 'cancelled') return 'This order was cancelled, so its lines and offers are locked.';
	if (order.status === 'delivered') return 'This order has been delivered, so its lines and offers are locked.';
	if (order.requestStatus === 'approved') {
		return 'This order is approved, so its lines and offers are locked. Use adjustments on the Orders page for changes.';
	}
	if (order.requestStatus === 'rejected') return 'This order was rejected, so its lines and offers are locked.';
	if (paidTowards(transaction) > 0) {
		return 'The customer has already paid towards this order, so its lines and offers are locked. Use adjustments on the Orders page for changes.';
	}
	return null;
}

/**
 * Why no offer can be sent for this order, or null. An approved, unpaid order
 * may still be resent (the customer lost the link); once money has come in the
 * balance flow on the Orders page takes over.
 */
function sendBlockReason(order: Order, transaction: Txn | undefined): string | null {
	if (order.status === 'cancelled') return 'This order was cancelled, so no offer can be sent.';
	if (order.status === 'delivered') return 'This order has already been delivered.';
	if (order.requestStatus === 'rejected') return 'This order was rejected, so no offer can be sent.';
	if (paidTowards(transaction) > 0) {
		return 'The customer has already paid towards this order. Use Request Balance on the Orders page instead of resending the offer.';
	}
	return null;
}

/** Common guard for the line and offer actions. */
function editProblem(
	order: Order | undefined,
	transaction: Txn | undefined,
	postedOrderId: number
): string | null {
	if (!order) return 'Start an order for this quote first.';
	if (order.id !== postedOrderId) return 'This form belongs to a different order. Reload the page and try again.';
	return lockReason(order, transaction);
}

function affectedRowsOf(result: unknown): number {
	const header = Array.isArray(result) ? result[0] : result;
	return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

// ── Pricing ─────────────────────────────────────────────────────────────────

async function linesOf(tx: DbLike, orderId: number): Promise<OrderLine[]> {
	return tx.select().from(orderItems).where(eq(orderItems.orderId, orderId)).orderBy(asc(orderItems.id));
}

/** The dimensions a basis multiplies its rate against; pricing reads a missing one as 0. */
const BASIS_DIMENSIONS: Record<PricingBasis, Array<'length' | 'width' | 'thickness' | 'weight'>> = {
	quantity: [],
	color: [],
	length: ['length'],
	width: ['width'],
	thickness: ['thickness'],
	weight: ['weight'],
	area: ['width', 'length']
};

/**
 * A line that would price at 0 without anyone noticing: no rate at all (lines
 * from the public quote form arrive unpriced), or a per-metre/area rate with no
 * length or width to multiply it by.
 */
function unpricedLineProblem(lines: OrderLine[]): string | null {
	for (const [index, line] of lines.entries()) {
		if (line.price == null) {
			return `Line ${index + 1} has no unit rate yet. Edit it and set a price before saving an offer.`;
		}
		const missing = BASIS_DIMENSIONS[line.priceBasis].filter((dim) => !(Number(line[dim]) > 0));
		if (missing.length > 0) {
			return `Line ${index + 1} is priced per ${line.priceBasis} but has no ${missing.join(' or ')}. Edit it before saving an offer.`;
		}
	}
	return null;
}

function priceLines(
	lines: OrderLine[],
	options: { discountPercentage: number; vatRate: number; withholdingRate?: number }
) {
	return calculateOrderPricing({
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
		...options
	});
}

/**
 * Why a saved offer no longer describes the order's lines, or null if it still
 * does. The email and pay page read the CURRENT lines next to the offer's
 * SAVED totals, so a stale offer would show new items at old prices.
 *
 * Two checks: a line added or edited after the offer was saved (catches spec
 * changes that don't move the price), and re-pricing the current lines with
 * the offer's own discount/VAT/withholding (catches deleted lines, which leave
 * no timestamp behind).
 */
function staleOfferReason(offer: Offer, lines: OrderLine[]): string | null {
	const stale = `The order lines changed since revision ${offer.revision} was saved. Save a new revision first.`;

	if (lines.some((l) => l.createdAt > offer.createdAt || l.updatedAt > offer.createdAt)) return stale;
	if (lines.length === 0 || unpricedLineProblem(lines)) return stale;

	const repriced = priceLines(lines, {
		discountPercentage: Number(offer.discountPercentage ?? 0),
		vatRate: Number(offer.vatRate),
		withholdingRate: Number(offer.withholdingRate)
	});
	const differs = (a: number, b: string | null) => Math.abs(a - Number(b ?? 0)) >= 0.01;
	if (differs(repriced.subtotal, offer.subtotal) || differs(repriced.total, offer.total)) return stale;

	return null;
}

async function latestOfferOf(tx: DbLike, orderId: number): Promise<Offer | undefined> {
	return tx
		.select()
		.from(priceOffers)
		.where(eq(priceOffers.orderId, orderId))
		.orderBy(desc(priceOffers.revision))
		.limit(1)
		.then((rows) => rows[0]);
}

/** Promo codes that can go on an offer right now — the same rules the promo-codes page shows as "Active". */
function usablePromoCondition(now: Date) {
	return and(
		eq(promoCodes.isActive, true),
		or(isNull(promoCodes.startsAt), lt(promoCodes.startsAt, now)),
		or(isNull(promoCodes.expiresAt), gt(promoCodes.expiresAt, now)),
		or(isNull(promoCodes.maxUses), lt(promoCodes.timesUsed, promoCodes.maxUses))
	);
}

/**
 * The `amount` label stored on a line. It was the price basis ("quantity"),
 * which customer history then showed as the item's name. Match what the orders
 * screen and checkout store: the variant SKU, else the piece count.
 */
async function lineLabel(variantId: number | null, quantity: number | null): Promise<string> {
	if (variantId) {
		const variant = await db
			.select({ sku: productVariants.sku })
			.from(productVariants)
			.where(eq(productVariants.id, variantId))
			.then((rows) => rows[0]);
		return variant?.sku ?? `variant-${variantId}`;
	}
	return quantity ? `qty-${quantity}` : 'custom spec';
}

// ── Load ────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ params }) => {
	const { quoteId, quote, order, transaction } = await loadQuoteContext(params.id);

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
				.orderBy(asc(orderItems.id))
		: [];

	const offers = order
		? await db
				.select()
				.from(priceOffers)
				.where(eq(priceOffers.orderId, order.id))
				.orderBy(desc(priceOffers.revision))
		: [];

	const latestOffer = offers[0];
	const staleReason = order && latestOffer ? staleOfferReason(latestOffer, await linesOf(db, order.id)) : null;
	const locked = order ? lockReason(order, transaction) : null;

	const replies = await db
		.select()
		.from(quoteReplies)
		.where(eq(quoteReplies.quoteRequestId, quoteId))
		.orderBy(desc(quoteReplies.createdAt));

	// Archived products/variants can't be sold any more, so they aren't offered.
	const productList = await db
		.select({ value: products.id, name: products.name })
		.from(products)
		.where(eq(products.isActive, true));

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
		.leftJoin(lengths, eq(lengths.id, productVariants.lengthId))
		.where(eq(productVariants.isActive, true));

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

	// Only codes that saveOffer will accept — expired, scheduled and used-up
	// codes used to be listed and then rejected on save.
	const promoCodeList = await db
		.select()
		.from(promoCodes)
		.where(usablePromoCondition(new Date()))
		.orderBy(asc(promoCodes.code));

	// The order id goes into the forms' INITIAL data: superforms resets a form
	// to the data it was created with, so an id assigned afterwards came back
	// as 0 after the first "Add line" and the second one failed validation.
	const orderId = order?.id;
	const addLineForm = await superValidate({ orderId }, zod4(addLine), { errors: false });
	const updateLineForm = await superValidate(zod4(updateLine));
	const deleteLineForm = await superValidate(zod4(deleteLine));
	const saveOfferForm = await superValidate({ orderId }, zod4(saveOffer), { errors: false });
	const sendOfferForm = await superValidate(zod4(sendOffer));
	const decideForm = await superValidate({ orderId }, zod4(decideOrder), { errors: false });

	return {
		quote,
		order,
		items,
		offers,
		latestOfferId: latestOffer?.id ?? null,
		staleReason,
		lockReason: locked,
		sendBlockReason: order ? sendBlockReason(order, transaction) : null,
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

// ── Actions ─────────────────────────────────────────────────────────────────

export const actions: Actions = {
	startOrder: async ({ params, locals }) => {
		const quoteId = parseIdParam(params.id);

		// An order created without a customer is a dead end: it can be priced but
		// never sent (sendQuotePaymentLink reads the address off the customer row)
		// and never paid (/pay/[token] refuses to render without one). The quote
		// request carries the contact details, so resolve them into a real
		// customer up front rather than inheriting a null.
		//
		// All of it runs in one transaction holding the quote row's lock, so a
		// double-click can't create two customers or two orders: the second
		// request waits, then sees the order the first one linked.
		try {
			const outcome = await db.transaction(async (tx) => {
				const quote = await tx
					.select({ id: quoteRequests.id, orderId: quoteRequests.orderId })
					.from(quoteRequests)
					.where(eq(quoteRequests.id, quoteId))
					.for('update')
					.then((r) => r[0]);
				if (!quote) return { ok: false, status: 404, message: 'Quote request not found.' } as const;
				if (quote.orderId) return { ok: true } as const;

				const resolved = await ensureQuoteCustomer(quoteId, tx);
				if (resolved.error) return { ok: false, status: 400, message: resolved.error } as const;

				const [order] = await tx
					.insert(orders)
					.values({
						customerId: resolved.customerId,
						status: 'pending',
						requestStatus: 'pending',
						createdBy: locals?.user?.id
					})
					.$returningId();

				await tx.update(quoteRequests).set({ orderId: order.id }).where(eq(quoteRequests.id, quoteId));
				return { ok: true } as const;
			});

			if (!outcome.ok) return fail(outcome.status, { message: outcome.message });
			return { started: true };
		} catch (err) {
			console.error('Start order failed:', err);
			return fail(500, { message: 'Could not start an order for this quote. Please try again.' });
		}
	},

	addLine: async ({ request, params, locals }) => {
		const form = await superValidate(request, zod4(addLine));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the line.' }, { status: 400 });

		const { order, transaction } = await loadQuoteContext(params.id);
		const problem = editProblem(order, transaction, form.data.orderId);
		if (problem || !order) return message(form, { type: 'error', text: problem! }, { status: 400 });

		const { basis, unitPrice, ...rest } = form.data;
		try {
			await db.insert(orderItems).values({
				orderId: order.id,
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
				amount: await lineLabel(rest.variantId, rest.quantity),
				createdBy: locals?.user?.id
			});
			return message(form, { type: 'success', text: 'Line added.' });
		} catch (err) {
			console.error('Add line failed:', err);
			return message(form, { type: 'error', text: 'Error adding line.' }, { status: 500 });
		}
	},

	updateLine: async ({ request, params, locals }) => {
		const form = await superValidate(request, zod4(updateLine));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the line.' }, { status: 400 });

		const { order, transaction } = await loadQuoteContext(params.id);
		const problem = editProblem(order, transaction, form.data.orderId);
		if (problem || !order) return message(form, { type: 'error', text: problem! }, { status: 400 });

		const { id, basis, unitPrice, ...rest } = form.data;
		try {
			const line = await db
				.select({ id: orderItems.id })
				.from(orderItems)
				.where(and(eq(orderItems.id, id), eq(orderItems.orderId, order.id)))
				.then((rows) => rows[0]);
			if (!line) {
				return message(form, { type: 'error', text: 'That line is not on this order.' }, { status: 404 });
			}

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
					amount: await lineLabel(rest.variantId, rest.quantity),
					updatedBy: locals?.user?.id
				})
				.where(and(eq(orderItems.id, id), eq(orderItems.orderId, order.id)));
			return message(form, { type: 'success', text: 'Line updated.' });
		} catch (err) {
			console.error('Update line failed:', err);
			return message(form, { type: 'error', text: 'Error updating line.' }, { status: 500 });
		}
	},

	deleteLine: async ({ request, params }) => {
		const form = await superValidate(request, zod4(deleteLine));
		if (!form.valid) return fail(400, { form });

		const { order, transaction } = await loadQuoteContext(params.id);
		const problem = order ? lockReason(order, transaction) : 'Start an order for this quote first.';
		if (problem || !order) return message(form, { type: 'error', text: problem! }, { status: 400 });

		try {
			const result = await db
				.delete(orderItems)
				.where(and(eq(orderItems.id, form.data.id), eq(orderItems.orderId, order.id)));
			if (affectedRowsOf(result) === 0) {
				return message(form, { type: 'error', text: 'That line is not on this order.' }, { status: 404 });
			}
			return message(form, { type: 'success', text: 'Line removed.' });
		} catch (err) {
			console.error('Delete line failed:', err);
			return message(form, { type: 'error', text: 'Error removing line.' }, { status: 500 });
		}
	},

	saveOffer: async ({ request, params, locals }) => {
		const form = await superValidate(request, zod4(saveOffer));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the offer.' }, { status: 400 });

		const { order, transaction } = await loadQuoteContext(params.id);
		const problem = editProblem(order, transaction, form.data.orderId);
		if (problem || !order) return message(form, { type: 'error', text: problem! }, { status: 400 });

		const { discountPercentage, promoCodeId, paymentTerms, validityDays, advancePaymentPercentage } = form.data;
		const orderId = order.id;

		try {
			const lines = await linesOf(db, orderId);
			if (lines.length === 0) {
				return message(form, { type: 'error', text: 'Add at least one line before saving an offer.' }, { status: 400 });
			}
			const unpriced = unpricedLineProblem(lines);
			if (unpriced) return message(form, { type: 'error', text: unpriced }, { status: 400 });

			const salesDiscount = discountPercentage ?? 0;
			let effectiveDiscount = salesDiscount;
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
				// timesUsed counts approved orders only (see approveOrder), so this
				// order's own earlier revisions no longer use up the limit.
				if (promo.maxUses != null && promo.timesUsed >= promo.maxUses) {
					return message(form, { type: 'error', text: 'Promo code has reached its usage limit.' }, { status: 400 });
				}
				// Promo stacks with (doesn't replace) a sales-person discount.
				effectiveDiscount += Number(promo.discountPercentage);
			}

			// 30% sales + 80% promo used to produce a free (0 ETB) offer that could
			// be sent, stored as "110.00".
			if (effectiveDiscount >= 100) {
				return message(
					form,
					{
						type: 'error',
						text: `The sales discount and promo code add up to ${effectiveDiscount}%. The combined discount must be below 100%.`
					},
					{ status: 400 }
				);
			}

			const pricing = priceLines(lines, {
				discountPercentage: effectiveDiscount,
				vatRate: vatRateOf(await getSiteSettings())
			});
			if (pricing.total <= 0) {
				return message(
					form,
					{ type: 'error', text: 'This offer totals 0 ETB. Check the line rates before saving.' },
					{ status: 400 }
				);
			}

			const staffId = await resolveStaffId(locals?.user?.id);

			const existing = await latestOfferOf(db, orderId);
			const nextRevision = (existing?.revision ?? 0) + 1;

			await db.insert(priceOffers).values({
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
			});

			return message(form, {
				type: 'success',
				text: `Offer revision ${nextRevision} saved. Total: ${pricing.total.toLocaleString()} ETB.`
			});
		} catch (err) {
			console.error('Save offer failed:', err);
			return message(form, { type: 'error', text: 'Error saving the offer.' }, { status: 500 });
		}
	},

	sendOffer: async ({ request, params, url }) => {
		const form = await superValidate(request, zod4(sendOffer));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { priceOfferId, subject, message: emailMessage } = form.data;
		const { quoteId, order, transaction } = await loadQuoteContext(params.id);

		// The send is deliberately NOT inside the same try as the writes, and the
		// "we replied" record is only written once the customer has actually been
		// told. Previously the quote_replies row and the `quoted` status were
		// committed first, so an SMTP failure left staff reading "Error sending
		// offer" against an order the system already believed had been quoted —
		// and every retry appended another reply row.
		const refuse = (text: string, status: 400 | 404 | 500 = 400) => message(form, { type: 'error', text }, { status });

		if (!order) return refuse('Start an order for this quote first.');
		const blocked = sendBlockReason(order, transaction);
		if (blocked) return refuse(blocked);

		try {
			const offer = await db
				.select()
				.from(priceOffers)
				.where(and(eq(priceOffers.id, priceOfferId), eq(priceOffers.orderId, order.id)))
				.then((r) => r[0]);
			if (!offer) return refuse('Offer not found on this order.', 404);

			// The email and pay page always use the LATEST revision, so sending an
			// older one would email the latest while billing the one clicked.
			const latest = await latestOfferOf(db, order.id);
			if (latest && latest.id !== offer.id) {
				return refuse(
					`Revision ${offer.revision} has been replaced. Only the latest revision (${latest.revision}) can be sent.`
				);
			}
			if (offer.status === 'rejected') {
				return refuse(`The customer rejected revision ${offer.revision}. Save a new revision to send.`);
			}

			const stale = staleOfferReason(offer, await linesOf(db, order.id));
			if (stale) return refuse(stale);

			// Orders started before this was enforced (and any whose customer row
			// has since been deleted) still carry a null customerId, which the
			// notification below can only report as "missing customer" — a state
			// no dashboard action could clear. Heal it here from the quote's own
			// contact details so an existing broken order becomes sendable.
			if (!order.customerId) {
				const resolved = await ensureQuoteCustomer(quoteId);
				if (resolved.error) return refuse(resolved.error);
			}

			// Money plumbing only. This half IS idempotent — a retry updates the
			// same transaction rather than creating a second one — so it is safe
			// to have run even if the send below never succeeds.
			await db.transaction(async (tx) => {
				if (order.transactionId) {
					// `amount` is the attempt in flight. Once the customer has started
					// a checkout, settlement verifies against it, so rewriting it here
					// would make that payment read as "amount short". The pay page
					// sets it from the latest offer on every new checkout anyway.
					await tx
						.update(transactions)
						.set({ amount: String(offer.total) })
						.where(and(eq(transactions.id, order.transactionId), isNull(transactions.txnRef)));
				} else {
					const [txn] = await tx
						.insert(transactions)
						.values({ amount: String(offer.total), paymentStatus: 'pending' })
						.$returningId();
					await tx.update(orders).set({ transactionId: txn.id }).where(eq(orders.id, order.id));
				}
			});
		} catch (err) {
			console.error('Send offer — preparing the order failed:', err);
			return refuse('Could not prepare the offer for sending. Please try again.', 500);
		}

		try {
			await sendQuotePaymentLink(order.id, url.origin);
		} catch (err) {
			console.error('Send offer — notification failed:', err);
			// NotificationError messages are written for staff (e.g. the order was
			// cancelled, or the customer has no email or phone).
			if (err instanceof NotificationError) return refuse(err.message, 400);
			return refuse(
				'The offer is saved, but it could not be sent to the customer — nothing was recorded as sent. Check the email settings and press Send again to retry.',
				500
			);
		}

		// Only now is it true that the customer was replied to.
		try {
			await db.insert(quoteReplies).values({
				quoteRequestId: quoteId,
				subject,
				message: emailMessage,
				priceOfferId,
				orderId: order.id
			});
			// A resend on an approved order must not demote `converted`.
			await db
				.update(quoteRequests)
				.set({ status: 'quoted' })
				.where(and(eq(quoteRequests.id, quoteId), ne(quoteRequests.status, 'converted')));
		} catch (err) {
			// The customer HAS the offer — failing the action here would invite a
			// resend they don't need. Log it; the reply log is the lesser record.
			console.error('Send offer — offer sent but recording it failed:', err);
		}

		return message(form, { type: 'success', text: 'Priced offer sent to customer.' });
	},

	approveOrder: async ({ request, params }) => {
		const form = await superValidate(request, zod4(decideOrder));
		if (!form.valid) return fail(400, { form });

		const { quoteId, order } = await loadQuoteContext(params.id);
		if (!order || order.id !== form.data.orderId) {
			return message(form, { type: 'error', text: 'This order does not belong to this quote.' }, { status: 400 });
		}

		try {
			// Checked and written under the order's row lock, so two clicks (or an
			// approve racing a reject) can only decide it once — which is also what
			// keeps the promo code from being counted twice.
			const refusal = await db.transaction(async (tx) => {
				const current = await tx
					.select()
					.from(orders)
					.where(eq(orders.id, order.id))
					.for('update')
					.then((rows) => rows[0]);
				if (!current) return 'Order not found.';
				if (current.status === 'cancelled') return 'This order was cancelled, so it cannot be approved.';
				if (current.requestStatus !== 'pending') return `This order has already been ${current.requestStatus}.`;

				const offer = await latestOfferOf(tx, current.id);
				if (!offer) return 'Save a price offer before approving this order.';
				if (offer.status === 'rejected') {
					return `The customer rejected revision ${offer.revision}. Save a new revision before approving.`;
				}
				const stale = staleOfferReason(offer, await linesOf(tx, current.id));
				if (stale) return stale;

				await tx
					.update(orders)
					.set({ requestStatus: 'approved' })
					.where(and(eq(orders.id, current.id), eq(orders.requestStatus, 'pending')));
				await tx.update(priceOffers).set({ status: 'accepted' }).where(eq(priceOffers.id, offer.id));

				// A promo is used once per order, when the order is approved — not on
				// every saved draft revision. The offer was valid when it was made
				// and may already be paid, so the use is recorded even if the code
				// has since hit its limit.
				if (offer.promoCodeId) {
					await tx
						.update(promoCodes)
						.set({ timesUsed: sql`${promoCodes.timesUsed} + 1` })
						.where(eq(promoCodes.id, offer.promoCodeId));
				}

				await tx.update(quoteRequests).set({ status: 'converted' }).where(eq(quoteRequests.id, quoteId));
				return null;
			});

			if (refusal) return message(form, { type: 'error', text: refusal }, { status: 400 });
			return message(form, { type: 'success', text: 'Order approved — now in the build queue.' });
		} catch (err) {
			console.error('Approve order failed:', err);
			return message(form, { type: 'error', text: 'Error approving order.' }, { status: 500 });
		}
	},

	rejectOrder: async ({ request, params }) => {
		const form = await superValidate(request, zod4(decideOrder));
		if (!form.valid) return fail(400, { form });

		const { order } = await loadQuoteContext(params.id);
		if (!order || order.id !== form.data.orderId) {
			return message(form, { type: 'error', text: 'This order does not belong to this quote.' }, { status: 400 });
		}

		try {
			const refusal = await db.transaction(async (tx) => {
				const current = await tx
					.select()
					.from(orders)
					.where(eq(orders.id, order.id))
					.for('update')
					.then((rows) => rows[0]);
				if (!current) return 'Order not found.';
				if (current.requestStatus !== 'pending') return `This order has already been ${current.requestStatus}.`;

				const txn = current.transactionId ? await loadTransaction(tx, current.transactionId) : undefined;
				if (paidTowards(txn) > 0) {
					return 'The customer has already paid towards this order. Refund or settle it on the Orders page before rejecting.';
				}

				await tx
					.update(orders)
					.set({ requestStatus: 'rejected' })
					.where(and(eq(orders.id, current.id), eq(orders.requestStatus, 'pending')));
				return null;
			});

			if (refusal) return message(form, { type: 'error', text: refusal }, { status: 400 });
			return message(form, { type: 'success', text: 'Order rejected.' });
		} catch (err) {
			console.error('Reject order failed:', err);
			return message(form, { type: 'error', text: 'Error rejecting order.' }, { status: 500 });
		}
	}
};
