// The single place stock quantities change.
//
// Source of truth is `stock_levels` (one row per variant per warehouse).
// `product_variants.quantity` and `products.quantity` are derived totals that
// the storefront, AI chat and admin tables read — every movement here
// re-syncs them, so nothing else should write those two columns directly.
//
// Every function takes the caller's transaction: a stock movement belongs to
// the business write that caused it (a delivery, a PO receipt, a batch) and
// must roll back with it.

import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	orderItems,
	orders,
	productVariants,
	products,
	purchaseOrderItems,
	purchaseOrders,
	rawMaterials,
	stockLevels,
	warehouses
} from '$lib/server/db/schema';

export type DbLike = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A stock rule was violated. `message` is safe to show to staff. */
export class StockError extends Error {}

function affectedRowsOf(result: unknown): number {
	const header = Array.isArray(result) ? result[0] : result;
	return (header as { affectedRows?: number } | undefined)?.affectedRows ?? 0;
}

/** The default warehouse id. Throws StockError when none is configured. */
export async function getDefaultWarehouseId(tx: DbLike): Promise<number> {
	const row = await tx
		.select({ id: warehouses.id })
		.from(warehouses)
		.where(eq(warehouses.isDefault, true))
		.orderBy(asc(warehouses.id))
		.limit(1)
		.then((rows) => rows[0]);
	if (!row) {
		throw new StockError('No default warehouse is set. Mark one warehouse as default first.');
	}
	return row.id;
}

/**
 * Recompute `product_variants.quantity` (sum of its warehouse rows) and
 * `products.quantity` (sum of its variants) for the given variants.
 */
export async function syncVariantTotals(tx: DbLike, variantIds: number[]): Promise<void> {
	const ids = [...new Set(variantIds)].filter((id) => Number.isInteger(id));
	if (ids.length === 0) return;

	await tx
		.update(productVariants)
		.set({
			quantity: sql`(SELECT COALESCE(SUM(${stockLevels.quantity}), 0) FROM ${stockLevels} WHERE ${stockLevels.variantId} = ${productVariants.id})`
		})
		.where(inArray(productVariants.id, ids));

	const productIds = await tx
		.selectDistinct({ id: productVariants.productId })
		.from(productVariants)
		.where(inArray(productVariants.id, ids))
		.then((rows) => rows.map((r) => r.id));
	if (productIds.length === 0) return;

	await tx
		.update(products)
		.set({
			quantity: sql`(SELECT COALESCE(SUM(pv.quantity), 0) FROM product_variants pv WHERE pv.product_id = ${products.id})`
		})
		.where(inArray(products.id, productIds));
}

/**
 * Change one variant's stock in one warehouse by `delta` (may be negative).
 * Atomic: a decrement only applies when it leaves the row at zero or above,
 * otherwise StockError is thrown and nothing changes.
 */
export async function adjustStock(
	tx: DbLike,
	{ variantId, warehouseId, delta }: { variantId: number; warehouseId: number; delta: number }
): Promise<void> {
	if (!Number.isInteger(delta)) throw new StockError('Stock quantities must be whole numbers.');
	if (delta === 0) return;

	if (delta > 0) {
		await tx
			.insert(stockLevels)
			.values({ variantId, warehouseId, quantity: delta })
			.onDuplicateKeyUpdate({ set: { quantity: sql`${stockLevels.quantity} + ${delta}` } });
	} else {
		const result = await tx
			.update(stockLevels)
			.set({ quantity: sql`${stockLevels.quantity} + ${delta}` })
			.where(
				and(
					eq(stockLevels.variantId, variantId),
					eq(stockLevels.warehouseId, warehouseId),
					sql`${stockLevels.quantity} + ${delta} >= 0`
				)
			);
		if (affectedRowsOf(result) === 0) {
			const have = await quantityIn(tx, variantId, warehouseId);
			throw new StockError(
				`Not enough stock for variant #${variantId} in this warehouse (have ${have}, need ${-delta}).`
			);
		}
	}

	await syncVariantTotals(tx, [variantId]);
}

/** Set one variant's stock in one warehouse to an exact quantity (>= 0). */
export async function setStock(
	tx: DbLike,
	{ variantId, warehouseId, quantity }: { variantId: number; warehouseId: number; quantity: number }
): Promise<void> {
	if (!Number.isInteger(quantity) || quantity < 0) {
		throw new StockError('Stock must be a whole number of zero or more.');
	}
	await tx
		.insert(stockLevels)
		.values({ variantId, warehouseId, quantity })
		.onDuplicateKeyUpdate({ set: { quantity } });
	await syncVariantTotals(tx, [variantId]);
}

async function quantityIn(tx: DbLike, variantId: number, warehouseId: number): Promise<number> {
	return tx
		.select({ quantity: stockLevels.quantity })
		.from(stockLevels)
		.where(and(eq(stockLevels.variantId, variantId), eq(stockLevels.warehouseId, warehouseId)))
		.then((rows) => rows[0]?.quantity ?? 0);
}

/**
 * Take `quantity` of a variant out of stock: default warehouse first, then the
 * warehouses holding the most. Throws StockError if all warehouses together
 * don't have enough.
 */
export async function deductVariant(tx: DbLike, variantId: number, quantity: number): Promise<void> {
	if (!Number.isInteger(quantity) || quantity <= 0) return;
	const defaultId = await getDefaultWarehouseId(tx);

	const rows = await tx
		.select({ warehouseId: stockLevels.warehouseId, quantity: stockLevels.quantity })
		.from(stockLevels)
		.where(and(eq(stockLevels.variantId, variantId), sql`${stockLevels.quantity} > 0`))
		.orderBy(desc(stockLevels.quantity));
	rows.sort((a, b) => Number(b.warehouseId === defaultId) - Number(a.warehouseId === defaultId));

	const available = rows.reduce((sum, r) => sum + r.quantity, 0);
	if (available < quantity) {
		const label = await variantLabel(tx, variantId);
		throw new StockError(`Not enough stock of ${label}: have ${available}, need ${quantity}.`);
	}

	let remaining = quantity;
	for (const row of rows) {
		if (remaining === 0) break;
		const take = Math.min(row.quantity, remaining);
		await adjustStock(tx, { variantId, warehouseId: row.warehouseId, delta: -take });
		remaining -= take;
	}
}

async function variantLabel(tx: DbLike, variantId: number): Promise<string> {
	const row = await tx
		.select({ name: products.name, sku: productVariants.sku })
		.from(productVariants)
		.innerJoin(products, eq(productVariants.productId, products.id))
		.where(eq(productVariants.id, variantId))
		.then((rows) => rows[0]);
	if (!row) return `variant #${variantId}`;
	return row.sku ? `${row.name} (${row.sku})` : `${row.name} (variant #${variantId})`;
}

async function orderVariantLines(tx: DbLike, orderId: number) {
	const lines = await tx
		.select({ variantId: orderItems.variantId, quantity: orderItems.quantity })
		.from(orderItems)
		.where(and(eq(orderItems.orderId, orderId), isNotNull(orderItems.variantId)));

	const totals = new Map<number, number>();
	for (const line of lines) {
		const qty = Number(line.quantity ?? 0);
		if (line.variantId == null || !Number.isInteger(qty) || qty <= 0) continue;
		totals.set(line.variantId, (totals.get(line.variantId) ?? 0) + qty);
	}
	return totals;
}

/**
 * Deduct an order's stock when it is delivered. Idempotent: claims
 * `orders.stock_deducted_at`, so a second call (re-saving a delivered order)
 * does nothing. Returns true if stock was deducted by this call.
 */
export async function deductStockForOrder(tx: DbLike, orderId: number): Promise<boolean> {
	const claim = await tx
		.update(orders)
		.set({ stockDeductedAt: new Date() })
		.where(and(eq(orders.id, orderId), isNull(orders.stockDeductedAt)));
	if (affectedRowsOf(claim) === 0) return false;

	for (const [variantId, quantity] of await orderVariantLines(tx, orderId)) {
		await deductVariant(tx, variantId, quantity);
	}
	return true;
}

/**
 * Put a delivered order's stock back (cancelled after delivery), into the
 * default warehouse. Idempotent: only acts when stock was deducted.
 * Returns true if stock was restored by this call.
 */
export async function restoreStockForOrder(tx: DbLike, orderId: number): Promise<boolean> {
	const claim = await tx
		.update(orders)
		.set({ stockDeductedAt: null })
		.where(and(eq(orders.id, orderId), isNotNull(orders.stockDeductedAt)));
	if (affectedRowsOf(claim) === 0) return false;

	const warehouseId = await getDefaultWarehouseId(tx);
	for (const [variantId, quantity] of await orderVariantLines(tx, orderId)) {
		await adjustStock(tx, { variantId, warehouseId, delta: quantity });
	}
	return true;
}

/** Change a raw material's on-hand quantity by `delta`; refuses to go below zero. */
export async function adjustRawMaterial(tx: DbLike, rawMaterialId: number, delta: number): Promise<void> {
	if (!Number.isFinite(delta) || delta === 0) return;
	const rounded = Math.round(delta * 1000) / 1000;
	const result = await tx
		.update(rawMaterials)
		.set({ quantityOnHand: sql`${rawMaterials.quantityOnHand} + ${rounded}` })
		.where(and(eq(rawMaterials.id, rawMaterialId), sql`${rawMaterials.quantityOnHand} + ${rounded} >= 0`));
	if (affectedRowsOf(result) === 0) {
		const row = await tx
			.select({ name: rawMaterials.name, onHand: rawMaterials.quantityOnHand, unit: rawMaterials.unit })
			.from(rawMaterials)
			.where(eq(rawMaterials.id, rawMaterialId))
			.then((rows) => rows[0]);
		if (!row) throw new StockError(`Raw material #${rawMaterialId} does not exist.`);
		throw new StockError(
			`Not enough ${row.name}: ${Number(row.onHand)} ${row.unit} on hand, need ${-rounded}.`
		);
	}
}

/**
 * Add a purchase order's lines to stock (finished-goods lines into
 * `warehouseId` or the default warehouse; raw-material lines to on-hand).
 * Idempotent via `purchase_orders.stock_received_at`. Returns true if stock
 * was added by this call.
 */
export async function receivePurchaseOrderStock(
	tx: DbLike,
	purchaseOrderId: number,
	warehouseId?: number
): Promise<boolean> {
	const claim = await tx
		.update(purchaseOrders)
		.set({ stockReceivedAt: new Date() })
		.where(and(eq(purchaseOrders.id, purchaseOrderId), isNull(purchaseOrders.stockReceivedAt)));
	if (affectedRowsOf(claim) === 0) return false;

	const target = warehouseId ?? (await getDefaultWarehouseId(tx));
	const lines = await tx
		.select({
			variantId: purchaseOrderItems.variantId,
			rawMaterialId: purchaseOrderItems.rawMaterialId,
			quantity: purchaseOrderItems.quantity
		})
		.from(purchaseOrderItems)
		.where(eq(purchaseOrderItems.purchaseOrderId, purchaseOrderId));

	for (const line of lines) {
		const qty = Number(line.quantity);
		if (line.variantId != null) {
			if (!Number.isInteger(qty)) {
				throw new StockError('Finished-goods PO lines must be whole numbers before receiving.');
			}
			await adjustStock(tx, { variantId: line.variantId, warehouseId: target, delta: qty });
		} else if (line.rawMaterialId != null) {
			await adjustRawMaterial(tx, line.rawMaterialId, qty);
		}
	}
	return true;
}
