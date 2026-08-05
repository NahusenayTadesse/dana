import { eq, and, or, like, sql, inArray, desc, type SQL } from 'drizzle-orm';
import { superValidate, message, fail } from 'sveltekit-superforms';
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
	orderAdjustments
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
import { saveUploadedFile } from '$lib/server/upload';
import { add, edit, requestBalance, addAdjustment, decideAdjustment } from './schema';
import { sendBalancePaymentLink, sendOrderAdjustmentNotice, sendAdjustmentDecisionNotice } from '$lib/server/notifications';
import { getAdjustedOrderTotals } from '$lib/server/orderAdjustments';
import type { Actions, PageServerLoad } from './$types';

const STATUSES = ['pending', 'delivered', 'cancelled'] as const;
type Status = (typeof STATUSES)[number];

const PER_PAGE = 20;

const spec = (value: string | number | null, unit: string | null) =>
	value != null ? `${Number(value)}${unit === 'gauge' ? 'ga' : unit}` : null;

export const load: PageServerLoad = async ({ url }) => {
	const raw = url.searchParams.get('status');
	const status: Status | null = STATUSES.includes(raw as Status) ? (raw as Status) : null;
	const q = (url.searchParams.get('q') ?? '').trim();

	// Per-order total, summed in SQL so it's searchable / sortable.
	const itemTotals = db
		.select({
			orderId: orderItems.orderId,
			total: sql<number>`SUM(${orderItems.quantity} * ${orderItems.price})`.as('total')
		})
		.from(orderItems)
		.groupBy(orderItems.orderId)
		.as('item_totals');

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
				sql`CAST(COALESCE(${itemTotals.total}, 0) AS CHAR) LIKE ${pattern}`,
				sql`CAST(${transactions.amount} AS CHAR) LIKE ${pattern}`
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
		.leftJoin(itemTotals, eq(orders.id, itemTotals.orderId))
		.where(whereClause);

	const totalPages = Math.max(1, Math.ceil(count / PER_PAGE));
	const requested = Number(url.searchParams.get('page')) || 1;
	const currentPage = Math.min(Math.max(1, requested), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	const allOrders = await db
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
			paymentStatus: transactions.paymentStatus,
			status: orders.status,
			createdAt: orders.createdAt,
			deliveryAddress: orders.deliveryAddress,
			deliveryDate: orders.deliveryDate,
			total: sql<number>`COALESCE(${itemTotals.total}, 0)`.mapWith(Number)
		})
		.from(orders)
		.leftJoin(customers, eq(orders.customerId, customers.id))
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(itemTotals, eq(orders.id, itemTotals.orderId))
		.where(whereClause)
		.orderBy(desc(orders.id))
		.limit(PER_PAGE)
		.offset(offset);

	const pageOrderIds = allOrders.map((o) => o.id);
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
					total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number),
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

	const allItems = rawItems.map((item) => ({ ...item, spec: itemSpec(item) }));

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
	const adjustedTotalsByOrder: Record<number, Awaited<ReturnType<typeof getAdjustedOrderTotals>>> = {};
	await Promise.all(
		pageOrderIds.map(async (id) => {
			adjustedTotalsByOrder[id] = await getAdjustedOrderTotals(id);
		})
	);

	const customerList = await db.select({ value: customers.id, name: customers.name }).from(customers);
	const productList = await db.select({ value: products.id, name: products.name }).from(products);
	const paymentMethodList = await db
		.select({ value: paymentMethods.id, name: paymentMethods.name })
		.from(paymentMethods);

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
		.leftJoin(lengths, eq(productVariants.lengthId, lengths.id));

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

async function resolveLines(items: { productId: number; variantId: number; quantity: number }[]) {
	const rows = await db
		.select({
			id: productVariants.id,
			productId: productVariants.productId,
			price: productVariants.price,
			sku: productVariants.sku
		})
		.from(productVariants)
		.where(inArray(productVariants.id, items.map((i) => i.variantId)));

	const map = new Map(rows.map((r) => [r.id, r]));

	for (const line of items) {
		const v = map.get(line.variantId);
		if (!v || v.productId !== line.productId) {
			return { error: 'A selected variant does not match its product.' as const };
		}
	}

	const total = items.reduce(
		(sum, line) => sum + Number(map.get(line.variantId)?.price ?? 0) * line.quantity,
		0
	);

	const values = (orderId: number, userId?: string) =>
		items.map((line) => {
			const v = map.get(line.variantId)!;
			return {
				orderId,
				productId: line.productId,
				variantId: line.variantId,
				quantity: line.quantity,
				price: v.price ?? '0',
				amount: v.sku ?? `variant-${line.variantId}`,
				createdBy: userId
			};
		});

	return { total, values };
}

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(add));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' });

		const { customer, status, items, paymentMethod, reciept } = form.data;
		const resolved = await resolveLines(items);
		if ('error' in resolved) return message(form, { type: 'error', text: resolved.error });

		const recieptLink = reciept && reciept.size > 0 ? await saveUploadedFile(reciept) : null;

		try {
			await db.transaction(async (tx) => {
				let transactionId: number | null = null;
				if (status === 'delivered') {
					const [txn] = await tx
						.insert(transactions)
						.values({
							amount: String(resolved.total),
							paymentStatus: 'paid',
							paymentMethodId: paymentMethod ?? null,
							recieptLink,
							createdBy: locals?.user?.id
						})
						.$returningId();
					transactionId = txn.id;
				}

				const [order] = await tx
					.insert(orders)
					.values({
						customerId: customer,
						status,
						transactionId,
						// Created directly by staff here, not via a customer quote
						// negotiation — treat it as already confirmed so it shows up
						// on this (now filtered-to-approved) page immediately.
						requestStatus: 'approved',
						createdBy: locals?.user?.id
					})
					.$returningId();

				await tx.insert(orderItems).values(resolved.values(order.id, locals?.user?.id));
			});

			return message(form, { type: 'success', text: 'Order created successfully.' });
		} catch (err) {
			console.error('Create order failed:', err);
			return message(form, { type: 'error', text: 'Could not create the order.' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(edit));
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form.' });

		const { id, customer, status, items, paymentMethod, reciept } = form.data;
		const resolved = await resolveLines(items);
		if ('error' in resolved) return message(form, { type: 'error', text: resolved.error });

		const recieptLink = reciept && reciept.size > 0 ? await saveUploadedFile(reciept) : null;

		try {
			await db.transaction(async (tx) => {
				const [ord] = await tx
					.select({ transactionId: orders.transactionId })
					.from(orders)
					.where(eq(orders.id, id));
				let transactionId = ord?.transactionId ?? null;

				let existingTxn:
					| { txnRef: string | null; paymentStatus: string | null; paymentMethodId: number | null }
					| undefined;
				if (transactionId) {
					[existingTxn] = await tx
						.select({
							txnRef: transactions.txnRef,
							paymentStatus: transactions.paymentStatus,
							paymentMethodId: transactions.paymentMethodId
						})
						.from(transactions)
						.where(eq(transactions.id, transactionId));
				}

				// The gateway is the source of truth: if it settled this order,
				// never overwrite its token / status / method — only refresh amount.
				const gatewaySettled = !!existingTxn?.txnRef && existingTxn?.paymentStatus === 'paid';

				if (status === 'delivered') {
					if (transactionId) {
						if (gatewaySettled) {
							await tx
								.update(transactions)
								.set({ amount: String(resolved.total) })
								.where(eq(transactions.id, transactionId));
						} else {
							await tx
								.update(transactions)
								.set({
									amount: String(resolved.total),
									paymentStatus: 'paid',
									paymentMethodId: paymentMethod ?? existingTxn?.paymentMethodId ?? null,
									...(recieptLink ? { recieptLink } : {})
								})
								.where(eq(transactions.id, transactionId));
						}
					} else {
						const [txn] = await tx
							.insert(transactions)
							.values({
								amount: String(resolved.total),
								paymentStatus: 'paid',
								paymentMethodId: paymentMethod ?? null,
								recieptLink,
								createdBy: locals?.user?.id
							})
							.$returningId();
						transactionId = txn.id;
					}
				}

				await tx
					.update(orders)
					.set({ customerId: customer, status, transactionId })
					.where(eq(orders.id, id));

				await tx.delete(orderItems).where(eq(orderItems.orderId, id));
				await tx.insert(orderItems).values(resolved.values(id, locals?.user?.id));
			});

			return message(form, { type: 'success', text: 'Order updated successfully.' });
		} catch (err) {
			console.error('Update order failed:', err);
			return message(form, { type: 'error', text: 'Could not update the order.' }, { status: 500 });
		}
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
			console.error('Request balance payment failed:', err);
			return message(
				form,
				{ type: 'error', text: err instanceof Error ? err.message : 'Could not send the balance payment link.' },
				{ status: 400 }
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
			await db.insert(orderAdjustments).values({
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

			await sendOrderAdjustmentNotice(orderId, { type, amount, reason, causedBy: 'company' }).catch((err) =>
				console.error('Adjustment notice failed:', err)
			);

			if (type === 'addition') {
				await sendBalancePaymentLink(orderId, url.origin).catch((err) =>
					console.error('Adjustment balance link failed:', err)
				);
			}

			return message(form, { type: 'success', text: 'Adjustment applied.' });
		} catch (err) {
			console.error('Add adjustment failed:', err);
			return message(form, { type: 'error', text: 'Could not apply the adjustment.' }, { status: 500 });
		}
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

		try {
			const adjustment = await db
				.select()
				.from(orderAdjustments)
				.where(eq(orderAdjustments.id, adjustmentId))
				.then((rows) => rows[0]);

			if (!adjustment) return message(form, { type: 'error', text: 'Adjustment not found.' }, { status: 404 });
			if (adjustment.status !== 'pending') {
				return message(form, { type: 'error', text: 'This request has already been decided.' }, { status: 400 });
			}

			await db
				.update(orderAdjustments)
				.set({
					status: approve ? 'approved' : 'rejected',
					approvedBy: locals?.user?.id,
					approvedAt: new Date(),
					notes: note ? `${adjustment.notes ?? ''}\n\nStaff note: ${note}`.trim() : adjustment.notes
				})
				.where(eq(orderAdjustments.id, adjustmentId));

			await sendAdjustmentDecisionNotice(adjustment.orderId, approve, note).catch((err) =>
				console.error('Adjustment decision notice failed:', err)
			);

			if (approve) {
				await sendOrderAdjustmentNotice(adjustment.orderId, {
					type: adjustment.type,
					amount: Number(adjustment.amount),
					reason: adjustment.reason,
					causedBy: adjustment.causedBy
				}).catch((err) => console.error('Adjustment notice failed:', err));

				if (adjustment.type === 'addition') {
					await sendBalancePaymentLink(adjustment.orderId, url.origin).catch((err) =>
						console.error('Adjustment balance link failed:', err)
					);
				}
			}

			return message(form, { type: 'success', text: approve ? 'Adjustment approved.' : 'Adjustment rejected.' });
		} catch (err) {
			console.error('Decide adjustment failed:', err);
			return message(form, { type: 'error', text: 'Could not process the decision.' }, { status: 500 });
		}
	},

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { deleted: false });

		try {
			await db.delete(orderItems).where(eq(orderItems.orderId, id));
			await db.delete(orders).where(eq(orders.id, id));
			return { deleted: true };
		} catch (err) {
			console.error('Delete order failed:', err);
			return fail(500, { deleted: false });
		}
	}
};