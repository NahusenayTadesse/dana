import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	products,
	productVariants,
	colors,
	widths,
	thicknesses,
	lengths
} from '$lib/server/db/schema';

/**
 * Variants as pickable options, labelled the way the rest of the dashboard
 * writes a spec: product name first, then the dimensions that distinguish this
 * variant from its siblings, then the SKU.
 *
 * Shared by the stock, production and purchase-order screens, all of which have
 * to point at a specific variant rather than a product.
 */

const dimension = (value: unknown, unit: string | null, label: string | null): string | null => {
	if (label) return label;
	if (value == null) return null;
	// 'gauge' reads as a word; every other unit is a bare suffix.
	return unit === 'gauge' ? `${Number(value)} ga` : `${Number(value)}${unit ?? ''}`;
};

export type VariantOption = { value: number; name: string; archived: boolean };

/**
 * By default only variants that can still be picked: the variant and its
 * product are both active. Deleting a variant or product that history refers
 * to archives it (isActive=false) instead, and archived ones must not be
 * offered for new stock, batches or purchase orders. Pass
 * `includeInactive: true` to label stored rows — archived variants are then
 * suffixed "(archived)".
 */
export async function variantOptions(
	{ includeInactive = false }: { includeInactive?: boolean } = {}
): Promise<VariantOption[]> {
	const rows = await db
		.select({
			id: productVariants.id,
			isActive: productVariants.isActive,
			productIsActive: products.isActive,
			sku: productVariants.sku,
			productName: products.name,
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
		.innerJoin(products, eq(products.id, productVariants.productId))
		.leftJoin(colors, eq(colors.id, productVariants.colorId))
		.leftJoin(widths, eq(widths.id, productVariants.widthId))
		.leftJoin(thicknesses, eq(thicknesses.id, productVariants.thicknessId))
		.leftJoin(lengths, eq(lengths.id, productVariants.lengthId))
		.where(
			includeInactive
				? undefined
				: and(eq(productVariants.isActive, true), eq(products.isActive, true))
		);

	return rows.map((row) => {
		const spec = [
			row.colorName,
			dimension(row.thickness, row.thicknessUnit, row.thicknessLabel),
			dimension(row.width, row.widthUnit, row.widthLabel),
			dimension(row.length, row.lengthUnit, row.lengthLabel)
		]
			.filter(Boolean)
			.join(' · ');

		const archived = !row.isActive || !row.productIsActive;
		const name =
			[row.productName, spec || null, row.sku ? `(${row.sku})` : null].filter(Boolean).join(' — ') +
			(archived ? ' (archived)' : '');

		return { value: row.id, name, archived };
	});
}

/** A lookup from variant id to label, for tables rendering a stored variant. */
export async function variantLabels(): Promise<Map<number, string>> {
	return new Map(
		(await variantOptions({ includeInactive: true })).map((option) => [option.value, option.name])
	);
}
