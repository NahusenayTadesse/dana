import { db } from '$lib/server/db';
import { orders, transactions, customers, orderItems, products, colors, priceOffers } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function getOrderDetails(orderId: number) {
	const order = await db.select().from(orders).where(eq(orders.id, orderId)).then((r) => r[0]);
	if (!order) return null;

	const transaction = order.transactionId
		? await db
				.select()
				.from(transactions)
				.where(eq(transactions.id, order.transactionId))
				.then((r) => r[0])
		: undefined;

	const customer = order.customerId
		? await db.select().from(customers).where(eq(customers.id, order.customerId)).then((r) => r[0])
		: undefined;

	// The spec (colour/width/thickness/length) lives directly on orderItems now —
	// it's the customer's actual requested spec, not necessarily a catalog
	// variant's — so read it straight from the line item, only joining out to
	// colors for a display name.
	const items = await db
		.select({
			quantity: orderItems.quantity,
			price: orderItems.price,
			priceIncludesVat: orderItems.priceIncludesVat,
			variantId: orderItems.variantId,
			productName: products.name,
			colorName: colors.name,
			width: orderItems.width,
			widthUnit: orderItems.widthUnit,
			thickness: orderItems.thickness,
			thicknessUnit: orderItems.thicknessUnit,
			length: orderItems.length,
			lengthUnit: orderItems.lengthUnit
		})
		.from(orderItems)
		.leftJoin(products, eq(products.id, orderItems.productId))
		.leftJoin(colors, eq(colors.id, orderItems.colorId))
		.where(eq(orderItems.orderId, order.id));

	// Most recent price offer for this order — carries the VAT/withholding/total
	// breakdown and the advance-payment terms. May be absent for orders that
	// haven't been through the quote-builder (e.g. a direct retail checkout).
	const offer = await db
		.select()
		.from(priceOffers)
		.where(eq(priceOffers.orderId, order.id))
		.orderBy(desc(priceOffers.revision))
		.limit(1)
		.then((r) => r[0]);

	return { order, transaction, customer, items, offer };
}
