import type { CartItem } from '$lib/hooks/cart.svelte.js';
import { groupCartItems } from '$lib/cart-groups';
import { netOf, round2, vatOf, VAT_RATE } from '$lib/vat';
import * as m from '$lib/paraglide/messages.js';

/**
 * The order written the way the factory already writes it: a numbered block per
 * product, one row per cut, quantity × length carried out to a total length, and
 * a totals line under each block before the sheet lands on Grand Total / VAT /
 * Total Amount.
 *
 * This is the shape of the sheet staff fill in by hand today (the "Roll no"
 * column is theirs — nothing in the catalog knows a roll number, so it prints
 * empty for them to write in), and it is what the customer is used to reading.
 * Both the on-screen summary and every export are built from here so a printed
 * sheet, a PDF and a CSV all carry the same numbers in the same order.
 */

export type SheetRow = {
	/** Row number within its block, as on the paper sheet. */
	no: number;
	/** Product name — printed on the block's first row only, like the original. */
	description: string | null;
	/** Thickness × width, also on the first row only: a block shares one size. */
	size: string | null;
	quantity: number;
	length: number | null;
	lengthUnit: string;
	/** length × quantity — the material this row actually consumes. */
	totalLength: number | null;
	/** VAT-exclusive, matching the Grand Total / VAT / Total Amount footer. */
	unitPrice: number;
	totalValue: number;
};

export type SheetSection = {
	key: string;
	/** Block handle (A, B, C…) — the same letter /buy and /checkout show. */
	letter: string;
	productName: string;
	colorName: string | null;
	size: string;
	/** Unit the block's lengths are quoted in, for the column headings. */
	lengthUnit: string;
	rows: SheetRow[];
	totalQuantity: number;
	totalLengthText: string;
	totalValue: number;
};

export type OrderSheet = {
	sections: SheetSection[];
	totalQuantity: number;
	totalLengthText: string;
	/** Sum of every block's value, VAT-exclusive. */
	subTotal: number;
	vat: number;
	vatRate: number;
	/** Sub total + VAT — what the customer pays. */
	totalAmount: number;
};

type UnitTotal = { unit: string; total: number };

/**
 * Lengths are totalled per unit and only then stringified: an order can hold
 * metres and millimetres at once, and one number covering both would mean
 * nothing.
 */
function addLength(into: UnitTotal[], length: number, unit: string) {
	const entry = into.find((u) => u.unit === unit);
	if (entry) entry.total += length;
	else into.push({ unit, total: length });
}

function lengthText(byUnit: UnitTotal[]): string {
	if (byUnit.length === 0) return '';
	return byUnit.map((u) => `${round2(u.total)}${u.unit}`).join(' + ');
}

const thicknessText = (item: CartItem) =>
	item.thickness == null
		? null
		: `${Number(item.thickness)}${item.thicknessUnit === 'gauge' ? 'ga' : (item.thicknessUnit ?? '')}`;

const widthText = (item: CartItem) =>
	item.width == null ? null : `${Number(item.width)}${item.widthUnit ?? ''}`;

/** "0.4mm x 1000mm" — thickness first, the way the size is quoted on the sheet. */
export function sizeText(item: CartItem): string {
	return [thicknessText(item), widthText(item)].filter(Boolean).join(' x ');
}

/**
 * Group the cart into sheet blocks. Blocks come from groupCartItems, so a block
 * here is the same block, with the same letter, that the customer built the
 * order out of — "A2" on screen is row 2 of block A on the sheet.
 */
export function buildOrderSheet(items: CartItem[]): OrderSheet {
	const sections: SheetSection[] = groupCartItems(items).map((group) => {
		const head = group.items[0];
		const byUnit: UnitTotal[] = [];
		let totalQuantity = 0;
		let totalValue = 0;

		const rows: SheetRow[] = group.items.map((item, i) => {
			// Number(): CartItem.price is nullable for quote-only variants, which
			// never reach the cart (addItem refuses them).
			const unitPrice = netOf(Number(item.price), item.priceIncludesVat);
			const totalLength = item.length == null ? null : round2(item.length * item.quantity);

			totalQuantity += item.quantity;
			totalValue += unitPrice * item.quantity;
			if (totalLength != null) addLength(byUnit, totalLength, item.lengthUnit ?? '');

			return {
				no: i + 1,
				description: i === 0 ? head.productName : null,
				size: i === 0 ? sizeText(head) : null,
				quantity: item.quantity,
				length: item.length,
				lengthUnit: item.lengthUnit ?? '',
				totalLength,
				unitPrice: round2(unitPrice),
				totalValue: round2(unitPrice * item.quantity)
			};
		});

		return {
			key: group.key,
			letter: group.letter,
			productName: head.productName,
			colorName: head.colorName,
			size: sizeText(head),
			lengthUnit: group.items.find((i) => i.lengthUnit)?.lengthUnit ?? '',
			rows,
			totalQuantity,
			totalLengthText: lengthText(byUnit),
			totalValue: round2(totalValue)
		};
	});

	const allUnits: UnitTotal[] = [];
	let totalQuantity = 0;
	let subTotal = 0;
	let vat = 0;

	for (const item of items) {
		totalQuantity += item.quantity;
		subTotal += netOf(Number(item.price), item.priceIncludesVat) * item.quantity;
		vat += vatOf(Number(item.price), item.priceIncludesVat) * item.quantity;
		if (item.length != null) {
			addLength(allUnits, item.length * item.quantity, item.lengthUnit ?? '');
		}
	}

	return {
		sections,
		totalQuantity,
		totalLengthText: lengthText(allUnits),
		subTotal: round2(subTotal),
		vat: round2(vat),
		vatRate: VAT_RATE,
		totalAmount: round2(subTotal + vat)
	};
}

/** A row's length with its unit, for cells that stand outside a block heading. */
export function rowLengthText(row: SheetRow): string {
	return row.length == null ? '' : `${Number(row.length)}${row.lengthUnit}`;
}

export type CsvCell = string | number | null | undefined;

/**
 * The same sheet as a spreadsheet: block heading, rows, block total, the next
 * block, then Sub Total and the Grand Total / VAT / Total Amount corner. Opened
 * in Excel it lands column-for-column on the sheet the office already works
 * from, which is the point — nobody should have to re-type an order to file it.
 */
export function orderSheetCsvRows(sheet: OrderSheet): CsvCell[][] {
	const rows: CsvCell[][] = [];

	for (const section of sections(sheet)) rows.push(...section);

	rows.push([]);
	rows.push([
		m.sheet_sub_total(),
		'',
		'',
		'',
		sheet.totalQuantity,
		'',
		sheet.totalLengthText,
		'',
		sheet.subTotal.toFixed(2)
	]);
	rows.push([]);
	rows.push(['', '', '', '', '', '', '', m.sheet_grand_total(), sheet.subTotal.toFixed(2)]);
	rows.push([
		'',
		'',
		'',
		'',
		'',
		'',
		'',
		m.sheet_vat({ rate: sheet.vatRate }),
		sheet.vat.toFixed(2)
	]);
	rows.push(['', '', '', '', '', '', '', m.sheet_total_amount(), sheet.totalAmount.toFixed(2)]);

	return rows;
}

function sections(sheet: OrderSheet): CsvCell[][][] {
	return sheet.sections.map((section) => {
		const unit = section.lengthUnit;
		const out: CsvCell[][] = [
			[
				m.sheet_col_no(),
				m.sheet_col_description(),
				m.sheet_col_roll_no(),
				m.sheet_col_size(),
				m.sheet_col_qnty(),
				m.sheet_col_length({ unit }),
				m.sheet_col_total_length({ unit }),
				m.sheet_col_unit_price(),
				m.sheet_col_total_value()
			]
		];

		for (const row of section.rows) {
			out.push([
				row.no,
				row.no === 1 ? blockTitle(section) : '',
				'',
				row.size ?? '',
				row.quantity,
				row.length ?? '',
				row.totalLength ?? '',
				row.unitPrice.toFixed(2),
				row.totalValue.toFixed(2)
			]);
		}

		out.push([
			'',
			'',
			'',
			'',
			section.totalQuantity,
			'',
			section.totalLengthText,
			'',
			section.totalValue.toFixed(2)
		]);
		out.push([]);

		return out;
	});
}

/** "A · Corrugated Sheet (Signal Red)" — block letter, product, colour. */
export function blockTitle(section: SheetSection): string {
	const name = section.colorName
		? `${section.productName} (${section.colorName})`
		: section.productName;
	return `${section.letter} · ${name}`;
}
