import { superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';

import { edit, adjust, damaged, editGallery, upsertVariantPrice, deleteVariantPrice } from './schema';

import { db } from '$lib/server/db';
import {
	products,
	productImages,
	productAdjustments,
	damagedProducts,
	transactions,
	categoriesProducts,
	productTags,
	colors,
	widths,
	thicknesses,
	lengths,
	productVariants,
	variantPrices,
	orderItems,
	productionBatches,
	purchaseOrderItems,
	stockLevels
} from '$lib/server/db/schema';
import { and, asc, eq, inArray, ne, or, sql } from 'drizzle-orm';
import { fail, message } from 'sveltekit-superforms';
import { setFlash } from 'sveltekit-flash-message/server';

import { saveUploadedFile, deleteUploadedFile, UploadError } from '$lib/server/upload';
import { describeDbError, isDuplicateEntry, isMissingReference, isRowReferenced } from '$lib/server/dbErrors';
import { parseIdParam, toPositiveInt } from '$lib/server/params';
import {
	StockError,
	adjustStock,
	deductVariant,
	getDefaultWarehouseId,
	setStock
} from '$lib/server/stock';
import type { Actions, PageServerLoad } from './$types';
import { addVariant, editVariant } from './variant.schema';

const specLabel = (
	value: string | number,
	unit: string,
	label: string | null
): string => (label ? label : `${Number(value)}${unit === 'gauge' ? ' ga' : unit}`);

export const load: PageServerLoad = async ({ params }) => {
	const productId = parseIdParam(params.id);

	const [colorRows, widthRows, thicknessRows, lengthRows, variants] = await Promise.all([
		db
			.select({ id: colors.id, name: colors.name, hexValue: colors.hexValue })
			.from(colors)
			.where(eq(colors.isActive, true)),
		db.select().from(widths).where(eq(widths.isActive, true)),
		db.select().from(thicknesses).where(eq(thicknesses.isActive, true)),
		db.select().from(lengths).where(eq(lengths.isActive, true)),
		// Variants for this product, joined to spec names for the table. Archived
		// variants (deleted while history still refers to them) are left out.
		db
			.select({
				id: productVariants.id,
				colorId: productVariants.colorId,
				widthId: productVariants.widthId,
				thicknessId: productVariants.thicknessId,
				lengthId: productVariants.lengthId,
				sku: productVariants.sku,
				price: productVariants.price,
				// Synced total of this variant's warehouse rows — read-only here.
				quantity: productVariants.quantity,
				reorderLevel: productVariants.reorderLevel,
				imageUrl: productVariants.imageUrl,
				colorName: colors.name,
				width: widths.value,
				widthUnit: widths.unit,
				widthLabel: widths.label,
				thickness: thicknesses.value,
				thicknessUnit: thicknesses.unit,
				thicknessLabel: thicknesses.label,
				length: lengths.value,
				lengthUnit: lengths.unit,
				lengthLabel: lengths.label
			})
			.from(productVariants)
			.leftJoin(colors, eq(productVariants.colorId, colors.id))
			.leftJoin(widths, eq(productVariants.widthId, widths.id))
			.leftJoin(thicknesses, eq(productVariants.thicknessId, thicknesses.id))
			.leftJoin(lengths, eq(productVariants.lengthId, lengths.id))
			.where(and(eq(productVariants.productId, productId), eq(productVariants.isActive, true)))
			.orderBy(asc(productVariants.id))
	]);

	// Standard price book rows for every variant of this product, grouped by
	// variantId so the UI can show/manage each variant's rates independently.
	const variantIds = variants.map((v) => v.id);
	const priceRows =
		variantIds.length > 0
			? await db.select().from(variantPrices).where(inArray(variantPrices.variantId, variantIds))
			: [];
	const variantPricesByVariant: Record<number, typeof priceRows> = {};
	for (const row of priceRows) {
		(variantPricesByVariant[row.variantId] ??= []).push(row);
	}

	const addVariantForm = await superValidate(zod4(addVariant));
	const editVariantForm = await superValidate(zod4(editVariant));
	const upsertVariantPriceForm = await superValidate(zod4(upsertVariantPrice));
	const deleteVariantPriceForm = await superValidate(zod4(deleteVariantPrice));

	// Picker items for the Adjust / Damaged dialogs: stock moves per variant.
	const variantItems = variants.map((v) => {
		const spec = [
			v.colorName,
			v.thickness != null ? specLabel(v.thickness, v.thicknessUnit ?? '', v.thicknessLabel) : null,
			v.width != null ? specLabel(v.width, v.widthUnit ?? '', v.widthLabel) : null,
			v.length != null ? specLabel(v.length, v.lengthUnit ?? '', v.lengthLabel) : null
		]
			.filter(Boolean)
			.join(' · ');
		const label = [spec || null, v.sku ? `(${v.sku})` : null].filter(Boolean).join(' ');
		return { value: v.id, name: `${label || `Variant #${v.id}`} — ${v.quantity} in stock` };
	});

	return {
		addVariantForm,
		editVariantForm,
		upsertVariantPriceForm,
		deleteVariantPriceForm,
		variants,
		variantItems,
		variantPricesByVariant,
		colorItems: colorRows.map((c) => ({ value: c.id, name: c.name })),
		widthItems: widthRows.map((w) => ({ value: w.id, name: specLabel(w.value, w.unit, w.label) })),
		thicknessItems: thicknessRows.map((t) => ({
			value: t.id,
			name: specLabel(t.value, t.unit, t.label)
		})),
		lengthItems: lengthRows.map((l) => ({ value: l.id, name: specLabel(l.value, l.unit, l.label) }))
	};
};

// ── helpers ────────────────────────────────────────────────────────────────

/** Remove uploads nothing points at any more. Never fails the request. */
async function removeFiles(files: Array<string | null | undefined>): Promise<void> {
	const names = [...new Set(files.filter((f): f is string => !!f))];
	await Promise.all(
		names.map((name) =>
			deleteUploadedFile(name).catch((err) => console.error('Failed to remove upload:', name, err))
		)
	);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "3 orders, 1 production batch and 2 purchase orders" */
function describeUsage(parts: Array<[number, string]>): string {
	const used = parts.filter(([n]) => n > 0).map(([n, word]) => plural(n, word));
	if (used.length <= 1) return used[0] ?? '';
	return `${used.slice(0, -1).join(', ')} and ${used.at(-1)}`;
}

type VariantUsage = { orders: number; batches: number; purchaseOrders: number };

/** How many orders / production batches / purchase orders refer to these variants. */
async function variantUsage(variantIds: number[]): Promise<VariantUsage> {
	if (variantIds.length === 0) return { orders: 0, batches: 0, purchaseOrders: 0 };
	const [orders, batches, purchaseOrders] = await Promise.all([
		db
			.select({ n: sql<number>`COUNT(DISTINCT ${orderItems.orderId})` })
			.from(orderItems)
			.where(inArray(orderItems.variantId, variantIds)),
		db
			.select({ n: sql<number>`COUNT(*)` })
			.from(productionBatches)
			.where(inArray(productionBatches.variantId, variantIds)),
		db
			.select({ n: sql<number>`COUNT(DISTINCT ${purchaseOrderItems.purchaseOrderId})` })
			.from(purchaseOrderItems)
			.where(inArray(purchaseOrderItems.variantId, variantIds))
	]);
	return {
		orders: Number(orders[0]?.n ?? 0),
		batches: Number(batches[0]?.n ?? 0),
		purchaseOrders: Number(purchaseOrders[0]?.n ?? 0)
	};
}

/** Units currently held for these variants across all warehouses. */
async function unitsInStock(variantIds: number[]): Promise<number> {
	if (variantIds.length === 0) return 0;
	const [row] = await db
		.select({ n: sql<number>`COALESCE(SUM(${stockLevels.quantity}), 0)` })
		.from(stockLevels)
		.where(inArray(stockLevels.variantId, variantIds));
	return Number(row?.n ?? 0);
}

/** A variant of this product (active or not), or undefined. */
async function findVariant(productId: number, variantId: number) {
	return db
		.select({
			id: productVariants.id,
			isActive: productVariants.isActive,
			imageUrl: productVariants.imageUrl
		})
		.from(productVariants)
		.where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
		.then((rows) => rows[0]);
}

/**
 * Another variant of this product with exactly this colour / width /
 * thickness / length. The DB unique index can't catch this when any of the
 * four is NULL (MySQL treats NULLs as distinct), so compare with the
 * NULL-safe `<=>` here.
 */
async function findSameSpec(
	productId: number,
	spec: { colorId: number | null; widthId: number | null; thicknessId: number | null; lengthId: number | null },
	excludeId?: number
) {
	return db
		.select({ id: productVariants.id, isActive: productVariants.isActive })
		.from(productVariants)
		.where(
			and(
				eq(productVariants.productId, productId),
				sql`${productVariants.colorId} <=> ${spec.colorId}`,
				sql`${productVariants.widthId} <=> ${spec.widthId}`,
				sql`${productVariants.thicknessId} <=> ${spec.thicknessId}`,
				sql`${productVariants.lengthId} <=> ${spec.lengthId}`,
				excludeId != null ? ne(productVariants.id, excludeId) : undefined
			)
		)
		.limit(1)
		.then((rows) => rows[0]);
}

/** Is this SKU taken by any other variant? */
async function skuTaken(sku: string, excludeId?: number): Promise<boolean> {
	const row = await db
		.select({ id: productVariants.id })
		.from(productVariants)
		.where(
			and(
				eq(productVariants.sku, sku),
				excludeId != null ? ne(productVariants.id, excludeId) : undefined
			)
		)
		.limit(1)
		.then((rows) => rows[0]);
	return !!row;
}

const SAME_SPEC_MESSAGE =
	'A variant with this exact colour / width / thickness / length already exists.';

function variantErrorMessage(err: unknown): string {
	if (err instanceof UploadError || err instanceof StockError) return err.message;
	if (isDuplicateEntry(err)) return 'That SKU or spec is already used by another variant.';
	if (isMissingReference(err)) {
		return 'A selected colour, width, thickness or length no longer exists. Reload and try again.';
	}
	return describeDbError(err, 'Unexpected error. Please try again.');
}

export const actions: Actions = {
	editProduct: async ({ request, locals, params }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(edit));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check your form data.' }, { status: 400 });
		}

		const {
			productName,
			brand,
			categoryId,
			tag,
			commission,
			description,
			supplier,
			reorderLevel,
			soldBy,
			thickness,
			width,
			maxLength,
			maxLengthUnit,
			isLengthCustomizable,
			minLength,
			lengthStep,
			coatingType,
			colorOptions,
			sizeRange,
			finish,
			image
		} = form.data;

		const existing = await db
			.select({ featuredImage: products.featuredImage })
			.from(products)
			.where(eq(products.id, productId))
			.then((rows) => rows[0]);
		if (!existing) {
			return message(form, { type: 'error', text: 'Product not found.' }, { status: 404 });
		}

		let featuredImage: string | undefined;
		try {
			featuredImage = image ? await saveUploadedFile(image) : undefined;

			await db.transaction(async (tx) => {
				await tx
					.update(products)
					.set({
						name: productName,
						description: description || null,
						brand: brand || null,
						// The product's one category — see +layout.server.ts.
						categoryId,
						commissionAmount: String(commission),
						supplierId: supplier ?? null,
						reorderLevel,
						soldBy,
						thickness: thickness ?? null,
						width: width ?? null,
						maxLength: maxLength != null ? String(maxLength) : null,
						maxLengthUnit,
						isLengthCustomizable,
						minLength: minLength != null ? String(minLength) : null,
						lengthStep: lengthStep != null ? String(lengthStep) : null,
						coatingType: coatingType ?? null,
						colorOptions: colorOptions ?? null,
						sizeRange: sizeRange ?? null,
						finish: finish ?? null,
						updatedBy: locals?.user?.id,
						...(featuredImage ? { featuredImage } : {})
					})
					.where(eq(products.id, productId));

				// Keep the join table as a mirror of products.categoryId (one row),
				// for anything still reading it.
				await tx.delete(categoriesProducts).where(eq(categoriesProducts.productId, productId));
				await tx.insert(categoriesProducts).values({
					productId,
					categoryId,
					createdBy: locals?.user?.id
				});

				// Re-sync tags (wipe + reinsert)
				await tx.delete(productTags).where(eq(productTags.productId, productId));
				const tagIds = [...new Set(tag ?? [])];
				if (tagIds.length > 0) {
					await tx.insert(productTags).values(tagIds.map((tagId) => ({ productId, tagId })));
				}
			});
		} catch (err) {
			console.error('Error updating product:', err);
			await removeFiles([featuredImage]);
			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			if (isMissingReference(err)) {
				return message(
					form,
					{
						type: 'error',
						text: 'The selected category, supplier or a tag no longer exists. Reload and try again.'
					},
					{ status: 400 }
				);
			}
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Product update failed. Please try again.') },
				{ status: 500 }
			);
		}

		// The replaced image is no longer referenced.
		if (featuredImage && existing.featuredImage && existing.featuredImage !== featuredImage) {
			await removeFiles([existing.featuredImage]);
		}

		return message(form, { type: 'success', text: 'Product Updated Successfully' });
	},

	// Add or remove stock for one variant of this product. Added stock goes into
	// the default warehouse; removed stock comes out of the default warehouse
	// first, then the others — and never below zero ($lib/server/stock).
	adjust: async ({ request, params, locals }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(adjust));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });
		}

		const { variantId, intent, quantity, reason, reciept, costPerItem, employeeResponsible } =
			form.data;

		const variant = await findVariant(productId, variantId);
		if (!variant || !variant.isActive) {
			return message(
				form,
				{ type: 'error', text: 'That variant no longer exists. Reload the page.' },
				{ status: 400 }
			);
		}

		const adjustment = intent === 'add' ? quantity : -quantity;
		// product_adjustments has no column for who was responsible, so it's
		// recorded with the reason rather than dropped.
		const note = [reason?.trim(), `Responsible: ${employeeResponsible}`]
			.filter(Boolean)
			.join(' — ')
			.slice(0, 255);
		const costTotal = Math.round(costPerItem * quantity * 100) / 100;

		let recieptLink: string | null = null;
		try {
			recieptLink = reciept ? await saveUploadedFile(reciept) : null;

			await db.transaction(async (tx) => {
				if (intent === 'add') {
					const warehouseId = await getDefaultWarehouseId(tx);
					await adjustStock(tx, { variantId, warehouseId, delta: quantity });
				} else {
					await deductVariant(tx, variantId, quantity);
				}

				// The receipt lives on a transactions row; its amount is money — the
				// cost of the stock (unit cost × quantity) — not the unit count.
				let transactionId: number | undefined;
				if (recieptLink) {
					const [row] = await tx
						.insert(transactions)
						.values({
							amount: costTotal.toFixed(2),
							recieptLink,
							createdBy: locals.user?.id
						})
						.$returningId();
					transactionId = row.id;
				}

				await tx.insert(productAdjustments).values({
					productsId: productId,
					adjustment,
					reason: note,
					transactionId,
					createdBy: locals.user?.id
				});

				await tx
					.update(products)
					.set({ updatedBy: locals.user?.id })
					.where(eq(products.id, productId));
			});

			return message(form, {
				type: 'success',
				text:
					intent === 'add'
						? `Added ${plural(quantity, 'unit')} to stock.`
						: `Removed ${plural(quantity, 'unit')} from stock.`
			});
		} catch (err) {
			console.error('Error adjusting stock:', err);
			await removeFiles([recieptLink]);
			if (err instanceof StockError || err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not change the stock. Please try again.') },
				{ status: 500 }
			);
		}
	},

	// A product that history refers to (orders, production, purchase orders,
	// stock adjustments or damage records) is archived — hidden from the
	// dashboard list, the shop and every picker — instead of deleted. Anything
	// else is deleted with its uploaded files.
	delete: async ({ cookies, params, locals }) => {
		const productId = parseIdParam(params.id);

		const product = await db
			.select({ id: products.id, featuredImage: products.featuredImage })
			.from(products)
			.where(eq(products.id, productId))
			.then((rows) => rows[0]);
		if (!product) {
			setFlash({ type: 'error', message: 'Product not found.' }, cookies);
			return fail(404);
		}

		const archive = async (reason: string) => {
			await db.transaction(async (tx) => {
				await tx
					.update(products)
					.set({ isActive: false, updatedBy: locals.user?.id })
					.where(eq(products.id, productId));
				await tx
					.update(productVariants)
					.set({ isActive: false, updatedBy: locals.user?.id })
					.where(eq(productVariants.productId, productId));
			});
			setFlash(
				{
					type: 'success',
					message: `Product archived instead of deleted because ${reason}. It is hidden from the shop and product lists.`
				},
				cookies
			);
		};

		try {
			const variantRows = await db
				.select({ id: productVariants.id, imageUrl: productVariants.imageUrl })
				.from(productVariants)
				.where(eq(productVariants.productId, productId));
			const variantIds = variantRows.map((v) => v.id);

			const [usage, directOrders, adjustmentCount, damagedCount] = await Promise.all([
				variantUsage(variantIds),
				db
					.select({ n: sql<number>`COUNT(DISTINCT ${orderItems.orderId})` })
					.from(orderItems)
					.where(
						variantIds.length > 0
							? or(eq(orderItems.productId, productId), inArray(orderItems.variantId, variantIds))
							: eq(orderItems.productId, productId)
					)
					.then((rows) => Number(rows[0]?.n ?? 0)),
				db
					.select({ n: sql<number>`COUNT(*)` })
					.from(productAdjustments)
					.where(eq(productAdjustments.productsId, productId))
					.then((rows) => Number(rows[0]?.n ?? 0)),
				db
					.select({ n: sql<number>`COUNT(*)` })
					.from(damagedProducts)
					.where(eq(damagedProducts.productId, productId))
					.then((rows) => Number(rows[0]?.n ?? 0))
			]);

			const usedIn = describeUsage([
				[directOrders, 'order'],
				[usage.batches, 'production batch'],
				[usage.purchaseOrders, 'purchase order'],
				[adjustmentCount, 'stock adjustment'],
				[damagedCount, 'damage record']
			]);
			if (usedIn) {
				await archive(`it is used in ${usedIn}`);
				return;
			}

			const inStock = await unitsInStock(variantIds);
			if (inStock > 0) {
				setFlash(
					{
						type: 'error',
						message: `This product still has ${plural(inStock, 'unit')} in stock. Remove the stock first (Stock page or Change Quantity), then delete it.`
					},
					cookies
				);
				return fail(400);
			}

			const galleryRows = await db
				.select({ url: productImages.imageUrl })
				.from(productImages)
				.where(eq(productImages.productId, productId));

			// Variants, prices, stock rows, images, tags, categories and discounts
			// cascade with the product.
			await db.delete(products).where(eq(products.id, productId));

			await removeFiles([
				product.featuredImage,
				...galleryRows.map((r) => r.url),
				...variantRows.map((v) => v.imageUrl)
			]);

			setFlash({ type: 'success', message: 'Product Deleted Successfully!' }, cookies);
		} catch (err) {
			// Something started referring to it between the check and the delete.
			if (isRowReferenced(err)) {
				try {
					await archive('it is used elsewhere');
					return;
				} catch (archiveErr) {
					console.error('Error archiving product:', archiveErr);
				}
			}
			console.error('Error deleting product:', err);
			setFlash(
				{ type: 'error', message: describeDbError(err, 'Could not delete the product. Please try again.') },
				cookies
			);
			return fail(500);
		}
	},

	// damaged_products has no variant column; the variant picked on the form only
	// decides whose stock the damaged units come out of.
	damaged: async ({ params, locals, request }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(damaged));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });
		}

		const { variantId, quantity, damagedBy, reason } = form.data;

		const variant = await findVariant(productId, variantId);
		if (!variant || !variant.isActive) {
			return message(
				form,
				{ type: 'error', text: 'That variant no longer exists. Reload the page.' },
				{ status: 400 }
			);
		}

		try {
			await db.transaction(async (tx) => {
				await tx.insert(damagedProducts).values({
					productId,
					quantity,
					createdBy: locals.user?.id,
					damagedBy,
					reason
				});

				await deductVariant(tx, variantId, quantity);
			});

			return message(form, {
				type: 'success',
				text: `Recorded ${plural(quantity, 'damaged unit')} and removed them from stock.`
			});
		} catch (err) {
			console.error('Error adding damaged supply:', err);
			if (err instanceof StockError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not record the damage. Please try again.') },
				{ status: 500 }
			);
		}
	},

	editGallery: async ({ params, request }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(editGallery));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the images.' }, { status: 400 });
		}

		const { existing, gallery } = form.data;

		const currentRows = await db
			.select({ url: productImages.imageUrl, colorId: productImages.colorId })
			.from(productImages)
			.where(eq(productImages.productId, productId))
			.orderBy(asc(productImages.id));
		const current = currentRows.map((r) => r.url);
		// The rows are rewritten below; carry each kept image's colour tag over.
		const colorByUrl = new Map(currentRows.map((r) => [r.url, r.colorId]));

		// Only images this product actually has can be kept — the list comes from
		// the browser, so anything else in it is ignored.
		const requested = new Set(
			(existing ?? '')
				.split(',')
				.map((item) => item.trim())
				.filter(Boolean)
		);
		const kept = current.filter((url) => requested.has(url));
		const removed = current.filter((url) => !requested.has(url));

		const uploaded: string[] = [];
		try {
			for (const file of gallery ?? []) {
				uploaded.push(await saveUploadedFile(file));
			}

			const finalList = [...new Set([...kept, ...uploaded])];

			await db.transaction(async (tx) => {
				await tx.delete(productImages).where(eq(productImages.productId, productId));
				if (finalList.length > 0) {
					await tx
						.insert(productImages)
						.values(
							finalList.map((url) => ({
								productId,
								imageUrl: url,
								colorId: colorByUrl.get(url) ?? null
							}))
						);
				}
			});
		} catch (err) {
			console.error('Error updating product gallery:', err);
			await removeFiles(uploaded);
			if (err instanceof UploadError) {
				return message(form, { type: 'error', text: err.message }, { status: 400 });
			}
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save the gallery. Please try again.') },
				{ status: 500 }
			);
		}

		await removeFiles(removed);

		return message(form, { type: 'success', text: 'Product gallery saved.' });
	},

	// Upserts one basis's rate for a variant's standard price book — basis is
	// unique per variant, so saving an existing basis just overwrites its rate.
	upsertVariantPrice: async ({ request, params }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(upsertVariantPrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' }, { status: 400 });
		}

		const { variantId, basis, price, priceIncludesVat } = form.data;

		const variant = await findVariant(productId, variantId);
		if (!variant) {
			return message(form, { type: 'error', text: 'Variant not found.' }, { status: 404 });
		}

		try {
			await db
				.insert(variantPrices)
				.values({ variantId, basis, price: String(price), priceIncludesVat })
				.onDuplicateKeyUpdate({ set: { price: String(price), priceIncludesVat } });

			return message(form, { type: 'success', text: 'Price rate saved Successfully!' });
		} catch (err) {
			console.error('Error saving variant price:', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not save the rate. Please try again.') },
				{ status: 500 }
			);
		}
	},

	deleteVariantPrice: async ({ request, params }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(deleteVariantPrice));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid form data' }, { status: 400 });
		}

		const { id } = form.data;

		try {
			// Scoped to this product's variants, so a posted id can't remove
			// another product's rate.
			await db
				.delete(variantPrices)
				.where(
					and(
						eq(variantPrices.id, id),
						inArray(
							variantPrices.variantId,
							db
								.select({ id: productVariants.id })
								.from(productVariants)
								.where(eq(productVariants.productId, productId))
						)
					)
				);

			return message(form, { type: 'success', text: 'Price rate deleted Successfully!' });
		} catch (err) {
			console.error('Error deleting variant price:', err);
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Could not delete the rate. Please try again.') },
				{ status: 500 }
			);
		}
	},

	addVariant: async ({ request, params, locals }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(addVariant));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { colorId, widthId, thicknessId, lengthId, price, quantity, reorderLevel, image } =
			form.data;
		const sku = form.data.sku?.trim() || null;

		const product = await db
			.select({ id: products.id })
			.from(products)
			.where(eq(products.id, productId))
			.then((rows) => rows[0]);
		if (!product) {
			return message(form, { type: 'error', text: 'Product not found.' }, { status: 404 });
		}

		const sameSpec = await findSameSpec(productId, { colorId, widthId, thicknessId, lengthId });
		if (sameSpec?.isActive) {
			return message(form, { type: 'error', text: SAME_SPEC_MESSAGE }, { status: 409 });
		}
		if (sku && (await skuTaken(sku, sameSpec?.id))) {
			return message(form, { type: 'error', text: 'That SKU is already in use.' }, { status: 409 });
		}

		let imageUrl: string | null = null;
		try {
			imageUrl = image ? await saveUploadedFile(image) : null;

			await db.transaction(async (tx) => {
				let variantId: number;

				if (sameSpec) {
					// An archived variant already has this spec (it was "deleted"
					// while orders still referred to it) — bring it back rather than
					// fail on the unique spec index.
					variantId = sameSpec.id;
					await tx
						.update(productVariants)
						.set({
							isActive: true,
							sku,
							price: price != null ? String(price) : null,
							reorderLevel: reorderLevel ?? null,
							updatedBy: locals?.user?.id,
							...(imageUrl ? { imageUrl } : {})
						})
						.where(eq(productVariants.id, variantId));
				} else {
					const [row] = await tx
						.insert(productVariants)
						.values({
							productId,
							colorId,
							widthId,
							thicknessId,
							lengthId,
							sku,
							price: price != null ? String(price) : null,
							// quantity is derived from stock_levels — set via setStock below.
							reorderLevel: reorderLevel ?? null,
							imageUrl,
							createdBy: locals?.user?.id // part of ...secureFields
						})
						.$returningId();
					variantId = row.id;
				}

				// Opening stock goes into the default warehouse; totals re-sync.
				if (quantity > 0) {
					const warehouseId = await getDefaultWarehouseId(tx);
					if (sameSpec) {
						await adjustStock(tx, { variantId, warehouseId, delta: quantity });
					} else {
						await setStock(tx, { variantId, warehouseId, quantity });
					}
				}
			});
		} catch (err) {
			console.error('Error adding variant:', err);
			await removeFiles([imageUrl]);
			const status = err instanceof UploadError || err instanceof StockError ? 400 : isDuplicateEntry(err) ? 409 : 500;
			return message(form, { type: 'error', text: variantErrorMessage(err) }, { status });
		}

		return message(form, {
			type: 'success',
			text: sameSpec
				? 'An archived variant with this spec was restored.'
				: 'Variant added successfully.'
		});
	},

	editVariant: async ({ request, params, locals }) => {
		const productId = parseIdParam(params.id);
		const form = await superValidate(request, zod4(editVariant));
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form.' }, { status: 400 });

		const { id, colorId, widthId, thicknessId, lengthId, price, reorderLevel, image } = form.data;
		const sku = form.data.sku?.trim() || null;

		const variant = await findVariant(productId, id);
		if (!variant) {
			return message(form, { type: 'error', text: 'Variant not found.' }, { status: 404 });
		}

		const sameSpec = await findSameSpec(productId, { colorId, widthId, thicknessId, lengthId }, id);
		if (sameSpec) {
			return message(
				form,
				{
					type: 'error',
					text: sameSpec.isActive
						? SAME_SPEC_MESSAGE
						: 'An archived variant of this product already has this exact spec.'
				},
				{ status: 409 }
			);
		}
		if (sku && (await skuTaken(sku, id))) {
			return message(form, { type: 'error', text: 'That SKU is already in use.' }, { status: 409 });
		}

		// Only overwrite the image if a new one was actually uploaded.
		let newImageUrl: string | undefined;
		try {
			newImageUrl = image ? await saveUploadedFile(image) : undefined;

			// No quantity: stock only changes through stock movements.
			await db
				.update(productVariants)
				.set({
					colorId,
					widthId,
					thicknessId,
					lengthId,
					sku,
					price: price != null ? String(price) : null,
					reorderLevel: reorderLevel ?? null,
					updatedBy: locals?.user?.id,
					...(newImageUrl ? { imageUrl: newImageUrl } : {})
				})
				.where(eq(productVariants.id, id));
		} catch (err) {
			console.error('Error updating variant:', err);
			await removeFiles([newImageUrl]);
			const status = err instanceof UploadError ? 400 : isDuplicateEntry(err) ? 409 : 500;
			return message(form, { type: 'error', text: variantErrorMessage(err) }, { status });
		}

		if (newImageUrl && variant.imageUrl && variant.imageUrl !== newImageUrl) {
			await removeFiles([variant.imageUrl]);
		}

		return message(form, { type: 'success', text: 'Variant updated successfully.' });
	},

	deleteVariant: async ({ request, params, locals }) => {
		const productId = parseIdParam(params.id);
		// Shares the edit form so the response keeps the client form's shape,
		// but a delete only needs the id — an unrelated invalid field (a stale
		// SKU, a bad price) must not block removing the row.
		const form = await superValidate(request, zod4(editVariant));
		const id = toPositiveInt(form.data.id);

		const variant = id == null ? undefined : await findVariant(productId, id);
		if (id == null || !variant)
			return message(form, { type: 'error', text: 'Variant not found.' }, { status: 404 });

		try {
			const usage = await variantUsage([id]);
			const usedIn = describeUsage([
				[usage.orders, 'order'],
				[usage.batches, 'production batch'],
				[usage.purchaseOrders, 'purchase order']
			]);

			if (usedIn) {
				await db
					.update(productVariants)
					.set({ isActive: false, updatedBy: locals?.user?.id })
					.where(eq(productVariants.id, id));
				return message(form, {
					type: 'success',
					text: `Variant archived instead of deleted because it is used in ${usedIn}. It is hidden from the shop and pickers.`
				});
			}

			const inStock = await unitsInStock([id]);
			if (inStock > 0) {
				return message(
					form,
					{
						type: 'error',
						text: `This variant still has ${plural(inStock, 'unit')} in stock. Remove the stock first (Stock page or Change Quantity), then delete it.`
					},
					{ status: 400 }
				);
			}

			// Its (empty) stock rows and price rates cascade with it.
			await db.delete(productVariants).where(eq(productVariants.id, id));
		} catch (err) {
			console.error('Error deleting variant:', err);
			if (isRowReferenced(err)) {
				await db
					.update(productVariants)
					.set({ isActive: false, updatedBy: locals?.user?.id })
					.where(eq(productVariants.id, id))
					.catch((archiveErr) => console.error('Error archiving variant:', archiveErr));
				return message(form, {
					type: 'success',
					text: 'Variant archived instead of deleted because it is used elsewhere.'
				});
			}
			return message(
				form,
				{ type: 'error', text: describeDbError(err, 'Unexpected error. Please try again.') },
				{ status: 500 }
			);
		}

		await removeFiles([variant.imageUrl]);
		return message(form, { type: 'success', text: 'Variant deleted successfully.' });
	}
};
