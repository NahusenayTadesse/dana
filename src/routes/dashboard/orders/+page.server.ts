import { eq, and, or, like, sql, inArray, desc } from 'drizzle-orm';
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
	lengths
} from '$lib/server/db/schema';
import { saveUploadedFile } from '$lib/server/upload';
import { add, edit } from './schema';
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

	// Build the WHERE from status + free-text search across everything an
	// order touches: customer, order id, token, payment status, total.
	const conditions = [];
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
			paymentMethod: transactions.paymentMethodId,
			recieptLink: transactions.recieptLink,
			txnRef: transactions.txnRef, // gateway token
			paymentStatus: transactions.paymentStatus,
			status: orders.status,
			createdAt: orders.createdAt,
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
	const allItems = pageOrderIds.length
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
					total: sql<number>`${orderItems.quantity} * ${orderItems.price}`.mapWith(Number)
				})
				.from(orderItems)
				.leftJoin(products, eq(orderItems.productId, products.id))
				.where(inArray(orderItems.orderId, pageOrderIds))
		: [];

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

	return {
		activeStatus: status ?? 'all',
		q,
		allOrders,
		allItems,
		customerList,
		productList,
		variantList,
		paymentMethodList,
		addForm,
		editForm,
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
					.values({ customerId: customer, status, transactionId, createdBy: locals?.user?.id })
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