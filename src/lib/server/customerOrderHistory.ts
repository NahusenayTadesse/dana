import { db } from '$lib/server/db';
import {
	orders,
	orderItems,
	products,
	colors,
	transactions,
	priceOffers
} from '$lib/server/db/schema';
import { eq, and, or, like, sql, inArray, desc, type SQL } from 'drizzle-orm';

// Shared between the customer-facing "my orders" page and the dashboard's
// per-customer history page — same filters (status/search/page), same shape,
// so both surfaces stay in sync instead of drifting into separate (and
// previously buggy) ad hoc queries.

export type OrderHistoryStatus = 'pending' | 'delivered' | 'cancelled';

export type OrderHistoryFilters = {
	customerId: number;
	status?: OrderHistoryStatus | null;
	q?: string | null;
	page?: number;
	perPage?: number;
};

export type OrderHistoryItem = {
	id: number;
	orderId: number | null;
	product: string;
	productId: number | null;
	quantity: number | string;
	amount: string;
	price: string | number;
	total: number;
	spec: string;
};

const itemSpec = (item: {
	colorName: string | null;
	thickness: string | null;
	thicknessUnit: string | null;
	width: string | null;
	widthUnit: string | null;
	length: string | null;
	lengthUnit: string | null;
}) =>
	[
		item.colorName,
		item.thickness != null ? `${Number(item.thickness)}${item.thicknessUnit === 'gauge' ? 'ga' : item.thicknessUnit}` : null,
		item.width != null ? `${Number(item.width)}${item.widthUnit}` : null,
		item.length != null ? `${Number(item.length)}${item.lengthUnit}` : null
	]
		.filter(Boolean)
		.join(' · ');

export async function fetchCustomerOrderHistory(filters: OrderHistoryFilters) {
	const perPage = filters.perPage ?? 10;
	const requestedPage = Math.max(1, filters.page ?? 1);

	// Per-order total, summed in SQL so it's usable for search/sort without a
	// stored column (an order's total is always derived from its line items).
	const itemTotals = db
		.select({
			orderId: orderItems.orderId,
			total: sql<number>`SUM(${orderItems.quantity} * ${orderItems.price})`.as('total')
		})
		.from(orderItems)
		.groupBy(orderItems.orderId)
		.as('item_totals');

	const conditions: (SQL<unknown> | undefined)[] = [eq(orders.customerId, filters.customerId)];
	if (filters.status) conditions.push(eq(orders.status, filters.status));
	if (filters.q) {
		const pattern = `%${filters.q}%`;
		conditions.push(
			or(
				like(transactions.txnRef, pattern),
				like(transactions.paymentStatus, pattern),
				like(orders.status, pattern),
				sql`CAST(${orders.id} AS CHAR) LIKE ${pattern}`,
				sql`CAST(COALESCE(${itemTotals.total}, 0) AS CHAR) LIKE ${pattern}`
			)
		);
	}
	const whereClause = and(...conditions);

	const [{ count }] = await db
		.select({ count: sql<number>`count(*)`.mapWith(Number) })
		.from(orders)
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(itemTotals, eq(orders.id, itemTotals.orderId))
		.where(whereClause);

	const totalPages = Math.max(1, Math.ceil(count / perPage));
	const page = Math.min(requestedPage, totalPages);
	const offset = (page - 1) * perPage;

	const orderRows = await db
		.select({
			id: orders.id,
			status: orders.status,
			requestStatus: orders.requestStatus,
			deliveryDate: orders.deliveryDate,
			deliveryAddress: orders.deliveryAddress,
			createdAt: orders.createdAt,
			paymentStatus: transactions.paymentStatus,
			txnRef: transactions.txnRef,
			amountPaid: transactions.amount,
			total: sql<number>`COALESCE(${itemTotals.total}, 0)`.mapWith(Number)
		})
		.from(orders)
		.leftJoin(transactions, eq(orders.transactionId, transactions.id))
		.leftJoin(itemTotals, eq(orders.id, itemTotals.orderId))
		.where(whereClause)
		.orderBy(desc(orders.id))
		.limit(perPage)
		.offset(offset);

	const orderIds = orderRows.map((o) => o.id);

	const rawItems = orderIds.length
		? await db
				.select({
					id: orderItems.id,
					orderId: orderItems.orderId,
					product: products.name,
					productId: orderItems.productId,
					quantity: orderItems.quantity,
					amount: orderItems.amount,
					price: orderItems.price,
					colorName: colors.name,
					thickness: orderItems.thickness,
					thicknessUnit: orderItems.thicknessUnit,
					width: orderItems.width,
					widthUnit: orderItems.widthUnit,
					length: orderItems.length,
					lengthUnit: orderItems.lengthUnit
				})
				.from(orderItems)
				.leftJoin(products, eq(products.id, orderItems.productId))
				.leftJoin(colors, eq(colors.id, orderItems.colorId))
				.where(inArray(orderItems.orderId, orderIds))
		: [];

	const items: OrderHistoryItem[] = rawItems.map((item) => ({
		id: item.id,
		orderId: item.orderId,
		product: item.product ?? `Product #${item.productId}`,
		productId: item.productId,
		quantity: item.quantity ?? 0,
		amount: item.amount,
		price: item.price ?? '0',
		total: Number(item.price ?? 0) * Number(item.quantity ?? 0),
		spec: itemSpec(item)
	}));

	// Latest price offer per order (when the order went through a formal
	// quote) — ordered per-order-then-by-revision-desc so the first row seen
	// for each orderId in the loop below is that order's newest revision.
	const offerRows = orderIds.length
		? await db
				.select()
				.from(priceOffers)
				.where(inArray(priceOffers.orderId, orderIds))
				.orderBy(priceOffers.orderId, desc(priceOffers.revision))
		: [];
	const offerByOrder = new Map<number, (typeof offerRows)[number]>();
	for (const offer of offerRows) {
		if (!offerByOrder.has(offer.orderId)) offerByOrder.set(offer.orderId, offer);
	}

	// Grouped items always have a real orderId (that's the group key) — this
	// narrower type is what actually reaches callers/components.
	type GroupedItem = Omit<OrderHistoryItem, 'orderId'> & { orderId: number };
	const itemsByOrder = new Map<number, GroupedItem[]>();
	for (const item of items) {
		if (item.orderId == null) continue;
		const list = itemsByOrder.get(item.orderId) ?? [];
		list.push({ ...item, orderId: item.orderId });
		itemsByOrder.set(item.orderId, list);
	}

	const enrichedOrders = orderRows.map((order) => ({
		...order,
		offer: offerByOrder.get(order.id) ?? null,
		items: itemsByOrder.get(order.id) ?? []
	}));

	return {
		orders: enrichedOrders,
		page,
		perPage,
		totalOrders: count,
		totalPages
	};
}

export type CustomerOrderHistory = Awaited<ReturnType<typeof fetchCustomerOrderHistory>>;
export type CustomerOrderHistoryRow = CustomerOrderHistory['orders'][number];
