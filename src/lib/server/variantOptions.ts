import { eq } from 'drizzle-orm';
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

export type VariantOption = { value: number; name: string };

export async function variantOptions(): Promise<VariantOption[]> {
	const rows = await db
		.select({
			id: productVariants.id,
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
		.leftJoin(lengths, eq(lengths.id, productVariants.lengthId));

	return rows.map((row) => {
		const spec = [
			row.colorName,
			dimension(row.thickness, row.thicknessUnit, row.thicknessLabel),
			dimension(row.width, row.widthUnit, row.widthLabel),
			dimension(row.length, row.lengthUnit, row.lengthLabel)
		]
			.filter(Boolean)
			.join(' · ');

		const name = [row.productName, spec || null, row.sku ? `(${row.sku})` : null]
			.filter(Boolean)
			.join(' — ');

		return { value: row.id, name };
	});
}

/** A lookup from variant id to label, for tables rendering a stored variant. */
export async function variantLabels(): Promise<Map<number, string>> {
	return new Map((await variantOptions()).map((option) => [option.value, option.name]));
}
