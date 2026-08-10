// The unit vocabularies, matching the mysqlEnum definitions in
// server/db/schema.ts exactly (widths.unit, thicknesses.unit, lengths.unit,
// and their orderItems counterparts).
//
// These exist because row types were being hand-written as `string | null`
// while every component consuming them declared the narrow union — so the
// widening had to be cast away at each call site, and a unit value outside the
// set would have flowed unchecked into unit-conversion and display logic.

export type WidthUnit = 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type ThicknessUnit = 'mm' | 'gauge';
export type LengthUnit = 'mm' | 'm' | 'ft';
export type WeightUnit = 'kg' | 'ton';
