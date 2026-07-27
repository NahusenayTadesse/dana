import { db } from '$lib/server/db';
import {
	orders,
	transactions,
	customers,
	orderItems,
	productVariants,
	products,
	colors,
	widths,
	thicknesses
} from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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

	const items = await db
		.select({
			quantity: orderItems.quantity,
			price: orderItems.price,
			variantId: orderItems.variantId,
			productName: products.name,
			colorName: colors.name,
			widthValue: widths.value,
			widthUnit: widths.unit,
			widthLabel: widths.label,
			thicknessValue: thicknesses.value,
			thicknessUnit: thicknesses.unit
		})
		.from(orderItems)
		.leftJoin(productVariants, eq(productVariants.id, orderItems.variantId))
		.leftJoin(products, eq(products.id, orderItems.productId))
		.leftJoin(colors, eq(colors.id, productVariants.colorId))
		.leftJoin(widths, eq(widths.id, productVariants.widthId))
		.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
		.where(eq(orderItems.orderId, order.id));

	return { order, transaction, customer, items };
}