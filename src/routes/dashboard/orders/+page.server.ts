import { eq, and, or, like, sql, inArray, desc, type SQL } from 'drizzle-orm';
import { superValidate, message, fail, setError, type SuperValidated } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { db } from '$lib/server/db';
import {
	orders,
	orderItems,
	products,
	productVariants,
	customers,
	transactions,
	paymentMethods,
	colors,
	widths,
	thicknesses,
	lengths,
	orderAdjustments,
	priceOffers
} from '$lib/server/db/schema';

// A spec string built from an order item's own requested dimensions — these
// are captured directly on orderItems (not just the variant), since a
// custom quote isn't limited to a catalog variant. This is what tells the
// factory floor what to actually cut/build.
const itemSpec = (item: {
	length: string | number | null;
	lengthUnit: string | null;
	thickness: string | number | null;
	thicknessUnit: string | null;
	width: string | number | null;
	widthUnit: string | null;
	colorName: string | null;
}) =>
	[
		item.colorName,
		item.thickness != null ? `${Number(item.thickness)}${item.thicknessUnit === 'gauge' ? 'ga' : item.thicknessUnit}` : null,
		item.width != null ? `${Number(item.width)}${item.widthUnit}` : null,
		item.length != null ? `${Number(item.length)}${item.lengthUnit}` : null
	]
		.filter(Boolean)
		.join(' · ');
import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { add, edit, requestBalance, addAdjustment, decideAdjustment } from './schema';
import {
	NotificationError,
	sendBalancePaymentLink,
	sendOrderAdjustmentNotice,
	sendAdjustmentDecisionNotice,
	sendOrderDeliveredNotice
} from '$lib/server/notifications';
import { getAdjustedOrderTotals, type AdjustedTotals } from '$lib/server/orderAdjustments';
import { getOrderTotal, getOrderTotals, getQuoteIdsForOrders } from '$lib/server/orders';
import {
	checkInFlightPayment,
	recordManualCollection,
	syncPaymentStatus
} from '$lib/server/paymentSettlement';
import { expirePaymentLinks } from '$lib/server/paymentLinks';
import { resolveOrderLines, OrderLineError, type ResolvedLine } from '$lib/server/orderLines';
import { priceLine, type PricingBasis } from '$lib/server/pricing';
import {
	deductStockForOrder,
	restoreStockForOrder,
	StockError,
	type DbLike
} from '$lib/server/stock';
import { describeDbError, isRowReferenced } from '$lib/server/dbErrors';
import { toPositiveInt } from '$lib/server/params';
import type { Actions, PageServerLoad } from './$types';

const STATUSES = ['pending', 'delivered', 'cancelled'] as const;
type Status = (typeof STATUSES)[number];

const PER_PAGE = 20;

/** Money comparisons need a cent of slack for decimal round-tripping. */
const AMOUNT_TOLERANCE = 0.01;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const spec = (value: string | number | null, unit: string | null) =>
	value != null ? `${Number(value)}${unit === 'gauge' ? 'ga' : unit}` : null;

/** A refusal whose message is safe to show staff (optionally on one field). */
class ActionError extends Error {
	constructor(
		message: string,
		readonly field?: 'paymentMethod' | 'amount',
		readonly status = 400
	) {
		super(message);
	}
}

function affectedRowsOf(result: unknown): number {
	const header = Array.isArray(result) ? result[0] : result;
	return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

/** Remove an upload that ended up unreferenced (rolled back, or replaced). */
async function discardUpload(fileName: string | null) {
	if (!fileName) return;
	await deleteUploadedFile(fileName).catch((err) =>
		console.error(`Could not remove orphaned upload ${fileName}:`, err)
	);
}

/**
 * Turn a thrown error into a form response. Known refusals (stock, uploads,
 * our own checks) show their message; anything else is logged and described
 * without the SQL text drizzle puts in `err.message`.
 */
function failure(form: SuperValidated<any>, err: unknown, fallback: string) {
	if (err instanceof StockError) {
		return message(form, { type: 'error', text: err.message }, { status: 409 });
	}
	if (err instanceof UploadError) {
		setError(form, 'reciept', err.message);
		return message(form, { type: 'error', text: err.message }, { status: 400 });
	}
	if (err instanceof ActionError) {
		if (err.field) setError(form, err.field, err.message);
		return message(form, { type: 'error', text: err.message }, { status: err.status as 400 });
	}
	console.error(fallback, err);
	return message(form, { type: 'error', text: describeDbError(err, fallback) }, { status: 500 });
}

export const load: PageServerLoad = async ({ url }) => {
	const raw = url.searchParams.get('status');
	const status: Status | null = STATUSES.includes(raw as Status) ? (raw as Status) : null;
	const q = (url.searchParams.get('q') ?? '').trim();

	// This page is the factory's build queue, not a negotiation inbox — only
	// orders staff have actually confirmed show up here. Anything still being
	// negotiated (pending) or turned down (rejected) only shows on the Quotes
	// page, where it gets approved/rejected.
	const conditions: (SQL<unknown> | undefined)[] = [eq(orders.requestStatus, 'approved')];
	if (status) conditions.push(eq(orders.status, status));
	if (q) {
		const pattern = `%${q}%`;
		conditions.push(
			or(
				like(customers.name, pattern),
				like(customers.phone, pattern),
				like(transactions.txnRef, pattern),
				like(transactions.paymentStatus, pattern),
				like(orders.status, pattern),
				sql`CAST(${orders.id} AS CHAR) LIKE ${pattern}`,
				// Money actually collected, and any offer total quoted — the
				// in-flight attempt (`transactions.amount`) isn't a figure
				// staff would recognise.
				sql`CAST(${transactions.amountPaid} AS CHAR) LIKE ${pattern}`,
				sql`EXISTS (SELECT 1 FROM ${priceOffers} WHERE ${priceOffers.orderId} = ${orders.id} AND CAST(${priceOffers.total} AS CHAR) LIKE ${pattern})`
			)
		);
	}
	const whereClause = conditions.length ? and(...conditions) : undefined;

	// Count (same joins/filter) to size the pager.
	const [{ count }] = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(whereClause);

	const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
	const requested = Number(url.searchParams.get('page')) || 1;
	const currentPage = Math.min(Math.max(1, requested), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	const orderRows = await db
		.select({
			id: orders.id,
			name: customers.name,
			phone: customers.phone,
			customerId: customers.id,
			customerType: customers.type,
			customerEmail: customers.email,
			customerPhone: customers.phone,
			paymentMethod: transactions.paymentMethodId,
			recieptLink: transactions.recieptLink,
			txnRef: transactions.txnRef, // gateway token
			settledTxnRef: transactions.settledTxnRef,
			amountPaid: transactions.amountPaid,
			paymentStatus: transactions.paymentStatus,
			status: orders.status,
			createdAt: orders.createdAt,
			deliveryAddress: orders.deliveryAddress,
			deliveryDate: orders.deliveryDate
		})
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.where(whereClause)
		.orderBy(desc(orders.id))
		.limit(PER_PAGE)
		.offset(offset);

	const pageOrderIds = orderRows.map((o) => o.id);

	// Totals for the whole page in a handful of queries (this used to run two
	// queries per row). The total is what the customer is actually billed:
	// the adjusted offer for quoted orders, the basis-aware lines with VAT for
	// staff-created ones — not SUM(quantity * price).
	const [totals, quoteIds] = await Promise.all([
		getOrderTotals(pageOrderIds),
		getQuoteIdsForOrders(pageOrderIds)
	]);

	const allOrders = orderRows.map((row) => {
		const t = totals.get(row.id);
		const total = t?.total ?? 0;
		const amountPaid = Number(row.amountPaid ?? 0);
		const hasOffer = t?.hasOffer ?? false;
		const quoteId = quoteIds.get(row.id) ?? null;
		return {
			...row,
			total,
			amountPaid,
			balanceDue: Math.max(0, round2(total - amountPaid)),
			hasOffer,
			quoteId,
			// Lines of a quoted order carry specs, bases and staff-set prices the
			// simple editor here can't represent — they're edited in the quote
			// builder only.
			linesLocked: hasOffer || quoteId != null,
			hasUnpricedLines: t?.hasUnpricedLines ?? false,
			// Actually settled through Chapa — a started-but-abandoned attempt
			// also leaves a txnRef behind.
			paidOnline: !!row.settledTxnRef
		};
	});

	const rawItems = pageOrderIds.length
		? await db
				.select({
					id: orderItems.id,
					orderId: orderItems.orderId,
					product: products.name,
					productId: orderItems.productId,
					variantId: orderItems.variantId,
					quantity: orderItems.quantity,
					amount: orderItems.amount,
					price: orderItems.price,
					priceBasis: orderItems.priceBasis,
					priceIncludesVat: orderItems.priceIncludesVat,
					weight: orderItems.weight,
					// The customer's actual requested spec, captured directly on the
					// line item — this is what the factory builds to, not the
					// (optional) suggested catalog variant.
					length: orderItems.length,
					lengthUnit: orderItems.lengthUnit,
					thickness: orderItems.thickness,
					thicknessUnit: orderItems.thicknessUnit,
					width: orderItems.width,
					widthUnit: orderItems.widthUnit,
					colorName: colors.name
				})
				.from(orderItems)
				.leftJoin(products, eq(orderItems.productId, products.id))
				.leftJoin(colors, eq(orderItems.colorId, colors.id))
				.where(inArray(orderItems.orderId, pageOrderIds))
		: [];

	const allItems = rawItems.map((item) => ({
		...item,
		spec: itemSpec(item),
		// Rate × the units it is charged on (pieces, metres, m²…), as stated on
		// the line — quantity × price was wrong for every non-piece basis.
		total:
			item.price == null
				? 0
				: round2(
						priceLine(
							{
								quantity: item.quantity,
								length: item.length == null ? null : Number(item.length),
								width: item.width == null ? null : Number(item.width),
								thickness: item.thickness == null ? null : Number(item.thickness),
								weight: item.weight == null ? null : Number(item.weight),
								basis: item.priceBasis as PricingBasis,
								unitPrice: Number(item.price),
								priceIncludesVat: false
							},
							0
						).gross
					)
	}));

	const allAdjustments = pageOrderIds.length
		? await db
				.select()
				.from(orderAdjustments)
				.where(inArray(orderAdjustments.orderId, pageOrderIds))
				.orderBy(desc(orderAdjustments.id))
		: [];

	// Current adjusted total per order (offer total + every approved
	// adjustment so far) — lets the adjustment dialog show a live "new total"
	// preview using the real VAT/withholding rates instead of guessing them.
	const adjustedTotalsByOrder: Record<number, AdjustedTotals | null> = {};
	for (const id of pageOrderIds) adjustedTotalsByOrder[id] = totals.get(id)?.adjusted ?? null;

	const customerList = await db.select({ value: customers.id, name: customers.name }).from(customers);
	// Archived products/variants can't be sold any more, so they aren't offered.
	const productList = await db
		.select({ value: products.id, name: products.name })
		.from(products)
		.where(eq(products.isActive, true));
	// Only methods staff can still take payment with — same rule as the
	// customer page.
	const paymentMethodList = await db
		.select({ value: paymentMethods.id, name: paymentMethods.name })
		.from(paymentMethods)
		.where(eq(paymentMethods.isActive, true));

	const variantRows = await db
		.select({
			id: productVariants.id,
			productId: productVariants.productId,
			sku: productVariants.sku,
			price: productVariants.price,
			colorName: colors.name,
			width: widths.value,
			widthUnit: widths.unit,
			thickness: thicknesses.value,
			thicknessUnit: thicknesses.unit,
			length: lengths.value,
			lengthUnit: lengths.unit
		})
		.from(productVariants)
		.leftJoin(colors, eq(productVariants.colorId, colors.id))
		.leftJoin(widths, eq(productVariants.widthId, widths.id))
		.leftJoin(thicknesses, eq(productVariants.thicknessId, thicknesses.id))
		.leftJoin(lengths, eq(productVariants.lengthId, lengths.id))
		.where(eq(productVariants.isActive, true));

	const variantList = variantRows.map((v) => {
		const label =
			[v.sku, v.colorName, spec(v.width, v.widthUnit), spec(v.thickness, v.thicknessUnit), spec(v.length, v.lengthUnit)]
				.filter(Boolean)
				.join(' · ') || `Variant #${v.id}`;
		const priceText = v.price != null ? ` — ETB ${Number(v.price).toLocaleString()}` : ' — quote';
		return { value: v.id, productId: v.productId, price: v.price, name: label + priceText };
	});

	const addForm = await superValidate(zod4(add));
	const editForm = await superValidate(zod4(edit));
	const requestBalanceForm = await superValidate(zod4(requestBalance));
	const addAdjustmentForm = await superValidate(zod4(addAdjustment));
	const decideAdjustmentForm = await superValidate(zod4(decideAdjustment));

	return {
		activeStatus: status ?? 'all',
		q,
		allOrders,
		allItems,
		allAdjustments,
		adjustedTotalsByOrder,
		customerList,
		productList,
		variantList,
		paymentMethodList,
		addForm,
		editForm,
		requestBalanceForm,
		addAdjustmentForm,
		decideAdjustmentForm,
		page: currentPage,
		perPage: PER_PAGE,
		totalOrders: count,
		totalPages
	};
};

type SubmittedLine = { productId: number; variantId: number; quantity: number };

/**
 * Resolve staff-picked lines through the same catalog resolver checkout uses,
 * so price, basis and VAT flag come from the price book (the old local copy
 * stored the flat variant price as a per-piece, VAT-exclusive rate — and a
 * quote-only variant as "0").
 */
async function resolveStaffLines(
	items: SubmittedLine[],
	tx: DbLike = db
): Promise<{ lines: ResolvedLine[] } | { error: string }> {
	let lines: ResolvedLine[];
	try {
		lines = await resolveOrderLines(
			items.map((i) => ({ product: i.productId, variantId: i.variantId, quantity: i.quantity })),
			tx
		);
	} catch (err) {
		if (err instanceof OrderLineError) {
			// Its messages are worded for a shopper's cart.
			return {
				error: 'A selected product or variant is inactive, or the variant does not belong to its product.'
			};
		}
		throw err;
	}

	if (lines.some((l) => l.price == null)) {
		return {
			error:
				'A selected variant has no catalog price. Give it a price on the product first, or sell it through a quote.'
		};
	}
	return { lines };
}

const lineValues = (orderId: number, lines: ResolvedLine[], userId?: string) =>
	lines.map((l) => ({
		orderId,
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
		lengthUnit: l.lengthUnit,
		createdBy: userId
	}));

/** Same product/variant/quantity lines, in any order. */
function sameLines(
	existing: { productId: number | null; variantId: number | null; quantity: number | null }[],
	submitted: SubmittedLine[]
) {
	const key = (l: { productId: number | null; variantId: number | null; quantity: number | null }) =>
		`${l.productId}:${l.variantId}:${l.quantity}`;
	const a = existing.map(key).sort();
	const b = submitted.map(key).sort();
	return a.length === b.length && a.every((k, i) => k === b[i]);
}

/** Point a transaction at a new receipt; returns the file it replaced. */
async function attachReceipt(tx: DbLike, transactionId: number, fileName: string) {
	const previous = await tx
		.select({ recieptLink: transactions.recieptLink })
		.from(transactions)
		.where(eq(transactions.id, transactionId))
		.then((rows) => rows[0]);
	await tx.update(transactions).set({ recieptLink: fileName }).where(eq(transactions.id, transactionId));
	return previous?.recieptLink && previous.recieptLink !== fileName ? previous.recieptLink : null;
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { customer, status, items, paymentMethod, reciept } = form.data;
		const userId = locals?.user?.id;

		let uploaded: string | null = null;
		let newOrderId: number | undefined;

		try {
			const resolved = await resolveStaffLines(items);
			if ('error' in resolved) {
				setError(form, 'items._errors', resolved.error);
				return message(form, { type: 'error', text: resolved.error }, { status: 400 });
			}

			// A receipt only means something for a delivered (paid) order.
			if (status === 'delivered' && reciept && reciept.size > 0) {
				uploaded = await saveUploadedFile(reciept);
			}

			await db.transaction(async (tx) => {
				const [order] = await tx
					.insert(orders)
					.values({
						customerId: customer,
						status,
						// Created directly by staff here, not via a customer quote
						// negotiation — treat it as already confirmed so it shows up
						// on this (now filtered-to-approved) page immediately.
						requestStatus: 'approved',
						createdBy: userId
					})
					.$returningId();

				await tx.insert(orderItems).values(lineValues(order.id, resolved.lines, userId));

				if (status === 'delivered') {
					// Booked as delivered = the sale is complete: the full total
					// (VAT included) was collected, and the goods left the warehouse.
					const { total } = await getOrderTotal(order.id, tx);
					await recordManualCollection(tx, {
						orderId: order.id,
						total,
						paymentMethodId: paymentMethod,
						recieptLink: uploaded,
						userId
					});
					await deductStockForOrder(tx, order.id);
				}
				newOrderId = order.id;
			});
		} catch (err) {
			await discardUpload(uploaded);
			return failure(form, err, 'Could not create the order.');
		}

		// An order booked straight into `delivered` is a completed sale the
		// customer was never told about — the delivered templates existed for
		// this and had no caller. Fire-and-forget: the order is committed, and
		// a mail failure must not report the sale as failed.
		if (status === 'delivered' && newOrderId != null) {
			sendOrderDeliveredNotice(newOrderId).catch((err) => console.error('Delivery notice failed:', err));
		}

		return message(form, { type: 'success', text: 'Order created successfully.' });
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { id, customer, status, items, paymentMethod, reciept } = form.data;
		const userId = locals?.user?.id;

		let current: { status: Status | null; requestStatus: string | null } | undefined;
		let linesLocked = false;
		let newLines: ResolvedLine[] | null = null;

		try {
			current = await db
				.select({ status: orders.status, requestStatus: orders.requestStatus })
				.from(orders)
				.where(eq(orders.id, id))
				.then((rows) => rows[0]);
			if (!current || current.requestStatus !== 'approved') {
				return message(form, { type: 'error', text: 'Order not found.' }, { status: 404 });
			}

			const [{ hasOffer }, quoteIds] = await Promise.all([getOrderTotal(id), getQuoteIdsForOrders([id])]);
			linesLocked = hasOffer || quoteIds.has(id);

			// Quoted orders: their lines hold specs, price bases and staff-set
			// prices, and the offer the customer pays is computed from them.
			// Re-saving them from this form replaced all of that with catalog
			// prices. They are only ever changed in the quote builder, so any
			// submitted items are ignored here.
			if (!linesLocked) {
				if (items.length === 0) {
					setError(form, 'items._errors', 'Add at least one product.');
					return message(form, { type: 'error', text: 'Add at least one product.' }, { status: 400 });
				}

				const existing = await db
					.select({
						productId: orderItems.productId,
						variantId: orderItems.variantId,
						quantity: orderItems.quantity
					})
					.from(orderItems)
					.where(eq(orderItems.orderId, id));

				// Unchanged lines are left alone — re-resolving them on every save
				// silently repriced the order to today's catalog.
				if (!sameLines(existing, items)) {
					if (current.status === 'delivered') {
						const text =
							"This order was delivered, so its items can't be changed — its stock and payment were recorded at delivery. Set it back to Pending first if the delivery really was different.";
						setError(form, 'items._errors', text);
						return message(form, { type: 'error', text }, { status: 400 });
					}
					const resolved = await resolveStaffLines(items);
					if ('error' in resolved) {
						setError(form, 'items._errors', resolved.error);
						return message(form, { type: 'error', text: resolved.error }, { status: 400 });
					}
					newLines = resolved.lines;
				}
			}
		} catch (err) {
			return failure(form, err, 'Could not update the order.');
		}

		// Only the TRANSITION into `delivered` collects payment, moves stock and
		// is announced — staff re-save delivered orders for all sorts of reasons
		// (attaching a receipt) and none of those may repeat it.
		const wasDelivered = current.status === 'delivered';
		const delivering = status === 'delivered' && !wasDelivered;

		if (delivering) {
			try {
				const refusal = await checkInFlightPayment(id);
				if (refusal) return message(form, { type: 'error', text: refusal }, { status: 409 });
			} catch (err) {
				return failure(form, err, 'Could not check this order’s online payments. Please try again.');
			}
		}

		let uploaded: string | null = null;
		let receiptAttached = false;
		let replacedReceipt: string | null = null;

		try {
			if (status === 'delivered' && reciept && reciept.size > 0) {
				uploaded = await saveUploadedFile(reciept);
			}

			await db.transaction(async (tx) => {
				const locked = await tx
					.select({ status: orders.status, transactionId: orders.transactionId })
					.from(orders)
					.where(eq(orders.id, id))
					.for('update')
					.then((rows) => rows[0]);
				if (!locked) throw new ActionError('Order not found.', undefined, 404);
				if ((locked.status === 'delivered') !== wasDelivered) {
					throw new ActionError(
						'Someone else just changed this order. Reload the page and try again.',
						undefined,
						409
					);
				}

				if (newLines) {
					await tx.delete(orderItems).where(eq(orderItems.orderId, id));
					await tx.insert(orderItems).values(lineValues(id, newLines, userId));
				}

				await tx
					.update(orders)
					.set({ customerId: customer, status, updatedBy: userId })
					.where(eq(orders.id, id));

				if (delivering) {
					const totals = await getOrderTotal(id, tx);
					if (!totals.hasOffer && totals.hasUnpricedLines) {
						throw new ActionError(
							'Some items on this order have no price. Price the order in the quote builder before marking it delivered.'
						);
					}

					const collected = locked.transactionId
						? await tx
								.select({ amountPaid: transactions.amountPaid })
								.from(transactions)
								.where(eq(transactions.id, locked.transactionId))
								.then((rows) => Number(rows[0]?.amountPaid ?? 0))
						: 0;

					if (collected + AMOUNT_TOLERANCE < totals.total) {
						// Delivered without full payment means the rest was collected
						// on delivery: record it as money received (the true total,
						// VAT and adjustments included), not just a "paid" label that
						// left the pay page still charging the balance.
						if (!paymentMethod) {
							throw new ActionError(
								'Choose how the remaining balance was paid before marking this order delivered.',
								'paymentMethod'
							);
						}
						({ replacedReceipt } = await recordManualCollection(tx, {
							orderId: id,
							total: totals.total,
							paymentMethodId: paymentMethod,
							recieptLink: uploaded,
							userId
						}));
						receiptAttached = uploaded != null;
					} else {
						// Already fully paid (e.g. online) — the gateway's record stands.
						await syncPaymentStatus(tx, id);
						if (uploaded && locked.transactionId) {
							replacedReceipt = await attachReceipt(tx, locked.transactionId, uploaded);
							receiptAttached = true;
						}
					}

					// A StockError here rolls back the whole save, payment included.
					await deductStockForOrder(tx, id);
				} else if (status === 'delivered') {
					if (uploaded && locked.transactionId) {
						replacedReceipt = await attachReceipt(tx, locked.transactionId, uploaded);
						receiptAttached = true;
					}
				} else {
					// Leaving delivered puts the goods back; a no-op for orders
					// whose stock was never taken out.
					await restoreStockForOrder(tx, id);
					if (status === 'cancelled') {
						// Nothing more to collect on a cancelled order.
						await expirePaymentLinks(id, tx);
					}
				}
			});
		} catch (err) {
			await discardUpload(uploaded);
			return failure(form, err, 'Could not update the order.');
		}

		await discardUpload(replacedReceipt);
		if (!receiptAttached) await discardUpload(uploaded);

		if (delivering) {
			sendOrderDeliveredNotice(id).catch((err) => console.error('Delivery notice failed:', err));
		}

		return message(form, { type: 'success', text: 'Order updated successfully.' });
	},

	// Fresh payment link for whatever's still owed — usable any time (after
	// delivery, mid-negotiation, whenever staff wants to chase the balance),
	// not gated to a specific order status.
	requestBalance: async ({ request, url }) => {
		const form = await superValidate(request, zod4(requestBalance));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		try {
			await sendBalancePaymentLink(form.data.orderId, url.origin);
			return message(form, { type: 'success', text: 'Balance payment link sent to the customer.' });
		} catch (err) {
			if (err instanceof NotificationError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			console.error('Request balance payment failed:', err);
			return message(
				form,
				{ type: 'error', text: 'Could not send the balance payment link. Please try again.' },
				{ status: 500 }
			);
		}
	},

	// Staff-created correction — takes effect immediately (auto-approved, since
	// staff already has the authority a customer-submitted request needs
	// review for). An addition triggers a fresh balance-payment link for the
	// extra amount; a deduction is just recorded — refunding it happens
	// outside the system, staff just needs to see the number.
	addAdjustment: async ({ request, locals, url }) => {
		const form = await superValidate(request, zod4(addAdjustment));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { orderId, type, amount, reason, notes } = form.data;

		try {
			await db.transaction(async (tx) => {
				const order = await tx
					.select({ status: orders.status, requestStatus: orders.requestStatus })
					.from(orders)
					.where(eq(orders.id, orderId))
					.for('update')
					.then((rows) => rows[0]);
				if (!order || order.requestStatus !== 'approved') {
					throw new ActionError('Order not found.', undefined, 404);
				}
				if (order.status === 'cancelled') {
					throw new ActionError(`Order #${orderId} is cancelled — adjustments can't be applied to it.`);
				}

				// Adjustments move an offer's total. A staff-created order has no
				// offer, so an adjustment used to be stored, change nothing, and
				// report success (or email a link that could never be paid).
				const adjusted = await getAdjustedOrderTotals(orderId, tx);
				if (!adjusted) {
					throw new ActionError(
						'This order has no price offer, so an adjustment would not change what the customer owes. Edit the order’s items instead.'
					);
				}
				if (type === 'deduction' && amount > adjusted.priceExcludingVat + AMOUNT_TOLERANCE / 2) {
					throw new ActionError(
						`A deduction can't be larger than the order's price before VAT (ETB ${adjusted.priceExcludingVat.toLocaleString()}).`,
						'amount'
					);
				}

				await tx.insert(orderAdjustments).values({
					orderId,
					type,
					amount: String(amount),
					reason,
					notes: notes ?? null,
					causedBy: 'company',
					status: 'approved',
					approvedBy: locals?.user?.id,
					approvedAt: new Date(),
					createdBy: locals?.user?.id
				});

				// A paid order with an addition owes money again (and vice versa).
				await syncPaymentStatus(tx, orderId);
			});
		} catch (err) {
			return failure(form, err, 'Could not apply the adjustment.');
		}

		// The adjustment is committed, so a mail failure must not fail the
		// action — but it must not be hidden either. "Adjustment applied."
		// on its own told staff the customer had been informed when the
		// notification (and, for an addition, the payment link they are now
		// waiting on) never left the building.
		const problems: string[] = [];
		const noteProblem = (label: string) => (err: unknown) => {
			console.error(label, err);
			problems.push(err instanceof NotificationError ? err.message : 'the customer could not be notified');
		};

		await sendOrderAdjustmentNotice(orderId, { type, amount, reason, causedBy: 'company' }).catch(
			noteProblem('Adjustment notice failed:')
		);

		if (type === 'addition') {
			await sendBalancePaymentLink(orderId, url.origin).catch(noteProblem('Adjustment balance link failed:'));
		}

		return message(form, {
			type: problems.length ? 'error' : 'success',
			text: problems.length
				? `Adjustment applied, but ${problems.join('; ')}. Check the order and resend the balance link if needed.`
				: 'Adjustment applied.'
		});
	},

	// Approve/reject a customer-submitted adjustment request (requested from
	// their account page). Approving an addition — unusual for a customer
	// request, since they'd only ever ask to pay less, but the type is
	// whatever staff/the request actually specified — sends a balance link
	// the same as a staff-created one.
	decideAdjustment: async ({ request, locals, url }) => {
		const form = await superValidate(request, zod4(decideAdjustment));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { adjustmentId, approve, note } = form.data;
		let adjustment: typeof orderAdjustments.$inferSelect | undefined;

		try {
			await db.transaction(async (tx) => {
				adjustment = await tx
					.select()
					.from(orderAdjustments)
					.where(eq(orderAdjustments.id, adjustmentId))
					.for('update')
					.then((rows) => rows[0]);

				if (!adjustment) throw new ActionError('Adjustment not found.', undefined, 404);
				if (adjustment.status !== 'pending') {
					throw new ActionError('This request has already been decided.', undefined, 409);
				}

				if (approve) {
					const order = await tx
						.select({ status: orders.status })
						.from(orders)
						.where(eq(orders.id, adjustment.orderId))
						.for('update')
						.then((rows) => rows[0]);
					if (!order || order.status === 'cancelled') {
						throw new ActionError('This order is cancelled — the request can only be rejected.');
					}
					const adjusted = await getAdjustedOrderTotals(adjustment.orderId, tx);
					if (!adjusted) {
						throw new ActionError(
							'This order has no price offer, so the adjustment would not change anything. Reject it and correct the order instead.'
						);
					}
					if (
						adjustment.type === 'deduction' &&
						Number(adjustment.amount) > adjusted.priceExcludingVat + AMOUNT_TOLERANCE / 2
					) {
						throw new ActionError(
							`This deduction is larger than the order's price before VAT (ETB ${adjusted.priceExcludingVat.toLocaleString()}) and can't be approved.`
						);
					}
				}

				// Conditional on still-pending: two staff deciding at once (or
				// approve + reject) must not both apply and both notify.
				const result = await tx
					.update(orderAdjustments)
					.set({
						status: approve ? 'approved' : 'rejected',
						approvedBy: locals?.user?.id,
						approvedAt: new Date(),
						notes: note ? `${adjustment.notes ?? ''}\n\nStaff note: ${note}`.trim() : adjustment.notes
					})
					.where(and(eq(orderAdjustments.id, adjustmentId), eq(orderAdjustments.status, 'pending')));
				if (affectedRowsOf(result) === 0) {
					throw new ActionError('This request has already been decided.', undefined, 409);
				}

				if (approve) await syncPaymentStatus(tx, adjustment.orderId);
			});
		} catch (err) {
			return failure(form, err, 'Could not process the decision.');
		}

		const decided = adjustment!;

		// Same reasoning as addAdjustment: the decision is recorded either
		// way, but staff must not read "Adjustment approved." as "and the
		// customer knows".
		const problems: string[] = [];
		const noteProblem = (label: string) => (err: unknown) => {
			console.error(label, err);
			problems.push(err instanceof NotificationError ? err.message : 'the customer could not be notified');
		};

		await sendAdjustmentDecisionNotice(decided.orderId, approve, note).catch(
			noteProblem('Adjustment decision notice failed:')
		);

		if (approve) {
			await sendOrderAdjustmentNotice(decided.orderId, {
				type: decided.type,
				amount: Number(decided.amount),
				reason: decided.reason,
				causedBy: decided.causedBy
			}).catch(noteProblem('Adjustment notice failed:'));

			if (decided.type === 'addition') {
				await sendBalancePaymentLink(decided.orderId, url.origin).catch(
					noteProblem('Adjustment balance link failed:')
				);
			}
		}

		const decision = approve ? 'Adjustment approved.' : 'Adjustment rejected.';
		return message(form, {
			type: problems.length ? 'error' : 'success',
			text: problems.length ? `${decision} But ${problems.join('; ')} — please follow up.` : decision
		});
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = toPositiveInt(data.get('id'));
		if (!id) return fail(400, { deleted: false, message: 'Invalid order.' });

		let receiptToRemove: string | null = null;

		try {
			// A customer mid-checkout on Chapa would pay for an order that no
			// longer exists.
			const refusal = await checkInFlightPayment(id);
			if (refusal) return fail(409, { deleted: false, message: refusal });

			await db.transaction(async (tx) => {
				const order = await tx
					.select({ transactionId: orders.transactionId })
					.from(orders)
					.where(eq(orders.id, id))
					.for('update')
					.then((rows) => rows[0]);
				if (!order) throw new ActionError('Order not found.', undefined, 404);

				const txn = order.transactionId
					? await tx
							.select({
								amountPaid: transactions.amountPaid,
								paymentStatus: transactions.paymentStatus,
								recieptLink: transactions.recieptLink
							})
							.from(transactions)
							.where(eq(transactions.id, order.transactionId))
							.for('update')
							.then((rows) => rows[0])
					: undefined;

				// Deleting a paid order erases the only record of money received.
				if (
					txn &&
					(Number(txn.amountPaid) > 0 ||
						txn.paymentStatus === 'paid' ||
						txn.paymentStatus === 'partially_paid')
				) {
					throw new ActionError(
						"Payments have been recorded on this order, so it can't be deleted. Set it to Cancelled instead.",
						undefined,
						409
					);
				}

				// Goods that left the warehouse for this order go back.
				await restoreStockForOrder(tx, id);

				// Offers, payment links and adjustments cascade with the order.
				await tx.delete(orderItems).where(eq(orderItems.orderId, id));
				await tx.delete(orders).where(eq(orders.id, id));

				// Its (unpaid) payment record would otherwise be orphaned. The
				// savepoint lets a still-referenced one simply stay.
				if (order.transactionId) {
					const transactionId = order.transactionId;
					const removed = await tx
						.transaction(async (sp) => {
							await sp.delete(transactions).where(eq(transactions.id, transactionId));
							return true;
						})
						.catch((err) => {
							if (isRowReferenced(err)) return false;
							throw err;
						});
					if (removed) receiptToRemove = txn?.recieptLink ?? null;
				}
			});
		} catch (err) {
			if (err instanceof ActionError) return fail(err.status, { deleted: false, message: err.message });
			if (err instanceof StockError) return fail(409, { deleted: false, message: err.message });
			console.error('Delete order failed:', err);
			return fail(500, { deleted: false, message: describeDbError(err, 'Could not delete the order.') });
		}

		await discardUpload(receiptToRemove);
		return { deleted: true, message: `Order #${id} deleted.` };
	}
};
