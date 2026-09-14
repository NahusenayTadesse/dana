// The unit vocabularies, matching the mysqlEnum definitions in
// server/db/schema.ts exactly (widths.unit, thicknesses.unit, lengths.unit,
// and their orderItems counterparts).
//
// These exist because row types were being hand-written as `string | null`
// while every component consuming them declared the narrow union — so the
// widening had to be cast away at each call site, and a unit value outside the
// set would have flowed unchecked into unit-conversion and display logic.

export const WIDTH_UNITS = ['mm', 'cm', 'm', 'in', 'ft'] as const;
export const THICKNESS_UNITS = ['mm', 'gauge'] as const;
export const LENGTH_UNITS = ['mm', 'm', 'ft'] as const;

export type WidthUnit = (typeof WIDTH_UNITS)[number];
export type ThicknessUnit = (typeof THICKNESS_UNITS)[number];
export type LengthUnit = (typeof LENGTH_UNITS)[number];
export type WeightUnit = 'kg' | 'ton';

const UNIT_NAMES: Record<WidthUnit | ThicknessUnit | LengthUnit, string> = {
	mm: 'Millimeter',
	cm: 'Centimeter',
	m: 'Meter',
	in: 'Inch',
	ft: 'Feet',
	gauge: 'Gauge'
};

// Dashboard select options. The thickness and length forms used to offer all
// five width units, so picking anything the column's enum lacks failed on save
// (and "gauge" could never be chosen at all).
export function unitOptions(units: readonly (keyof typeof UNIT_NAMES)[]) {
	return units.map((value) => ({ value, name: UNIT_NAMES[value] }));
}
