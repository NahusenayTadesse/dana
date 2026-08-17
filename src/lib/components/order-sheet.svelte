<script lang="ts">
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { blockTitle, buildOrderSheet } from '$lib/order-sheet';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * The order in the factory's own layout: a numbered block per product, one row
	 * per cut, quantity × length carried out to a total length, a totals line
	 * under each block, then Sub Total and the Grand Total / VAT / Total Amount
	 * corner.
	 *
	 * Fixed paper colours in both themes on purpose — this is the sheet, the same
	 * thing that comes out of the printer and opens in Excel, not a panel of the
	 * app. Colours are declared with print-color-adjust so the teal headings and
	 * yellow totals survive printing instead of coming out white.
	 */
	let {
		items,
		class: className = ''
	}: {
		items: CartItem[];
		class?: string;
	} = $props();

	const sheet = $derived(buildOrderSheet(items));

	const amount = (value: number) =>
		new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
			value
		);

	// A zero price is a real figure; a missing one is what the original sheet
	// leaves as a dash for the office to price by hand.
	const value = (n: number) => (n > 0 ? amount(n) : '-');
</script>

{#if sheet.sections.length > 0}
	<div class="order-sheet {className}">
		<table>
			<caption>{m.sheet_caption()}</caption>
			{#each sheet.sections as section (section.key)}
				<!-- Headings repeat for every block, as on the paper sheet: each
				     block has to read on its own once the page breaks between them.
				     They are header rows inside the block's own tbody rather than a
				     second thead, which a table may only have one of. -->
				<tbody>
					<tr class="head">
						<th scope="col" class="col-no">{m.sheet_col_no()}</th>
						<th scope="col" class="col-desc">{m.sheet_col_description()}</th>
						<th scope="col" class="col-roll">{m.sheet_col_roll_no()}</th>
						<th scope="col" class="col-size">{m.sheet_col_size()}</th>
						<th scope="col" class="num">{m.sheet_col_qnty()}</th>
						<th scope="col" class="num">{m.sheet_col_length({ unit: section.lengthUnit })}</th>
						<th scope="col" class="num">
							{m.sheet_col_total_length({ unit: section.lengthUnit })}
						</th>
						<th scope="col" class="num">{m.sheet_col_unit_price()}</th>
						<th scope="col" class="num">{m.sheet_col_total_value()}</th>
					</tr>
					{#each section.rows as row (row.no)}
						<tr>
							<td class="num-plain">{row.no}</td>
							<td class="desc">{row.no === 1 ? blockTitle(section) : ''}</td>
							<!-- Roll no: the factory's column, printed empty. -->
							<td></td>
							<td class="size">{row.size ?? ''}</td>
							<td class="num">{row.quantity}</td>
							<td class="num">{row.length ?? ''}</td>
							<td class="num">{row.totalLength ?? ''}</td>
							<td class="num">{value(row.unitPrice)}</td>
							<td class="num">{value(row.totalValue)}</td>
						</tr>
					{/each}
					<tr class="block-total">
						<td colspan="4" class="block-total-label">
							{m.sheet_block_total({ letter: section.letter })}
						</td>
						<td class="num hl">{section.totalQuantity}</td>
						<td></td>
						<td class="num hl">{section.totalLengthText}</td>
						<td></td>
						<td class="num hl">{value(section.totalValue)}</td>
					</tr>
				</tbody>
			{/each}

			<tfoot>
				<tr class="sub-total">
					<td colspan="4" class="sub-total-label">{m.sheet_sub_total()}</td>
					<td class="num hl">{sheet.totalQuantity}</td>
					<td></td>
					<td class="num hl">{sheet.totalLengthText}</td>
					<td></td>
					<td class="num hl">{value(sheet.subTotal)}</td>
				</tr>
				<tr class="corner">
					<td colspan="7" class="blank"></td>
					<td class="corner-label">{m.sheet_grand_total()}</td>
					<td class="num">{value(sheet.subTotal)}</td>
				</tr>
				<tr class="corner">
					<td colspan="7" class="blank"></td>
					<td class="corner-label">{m.sheet_vat({ rate: sheet.vatRate })}</td>
					<td class="num">{value(sheet.vat)}</td>
				</tr>
				<tr class="corner total-amount">
					<td colspan="7" class="blank"></td>
					<td class="corner-label">{m.sheet_total_amount()}</td>
					<td class="num">{value(sheet.totalAmount)}</td>
				</tr>
			</tfoot>
		</table>
		<p class="note">{m.sheet_roll_no_hint()}</p>
	</div>
{/if}

<style>
	/* Paper, not app: the sheet keeps its own colours in dark mode so what is on
	   screen is what prints and what opens in Excel. */
	.order-sheet {
		background: #fff;
		color: #111;
		overflow-x: auto;
		-webkit-print-color-adjust: exact;
		print-color-adjust: exact;
	}

	table {
		width: 100%;
		min-width: 640px;
		border-collapse: collapse;
		font-family: system-ui, sans-serif;
		font-size: 11px;
	}

	caption {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	th,
	td {
		border: 1px solid #9aa0a6;
		padding: 3px 6px;
		text-align: left;
		vertical-align: middle;
	}

	.head th {
		background: #1a99a8;
		color: #0b2b30;
		font-weight: 700;
		line-height: 1.2;
	}

	.num,
	.num-plain {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.num-plain,
	.col-no {
		text-align: center;
		width: 34px;
	}

	.col-desc {
		width: 30%;
	}

	.desc {
		font-weight: 700;
	}

	.size {
		font-weight: 600;
	}

	/* Yellow is the sheet's own convention for "this is a total" — kept, because
	   it is what the eye already jumps to on the paper version. */
	.hl {
		background: #ffff00;
		font-weight: 700;
	}

	.block-total-label,
	.sub-total-label {
		background: #bfbfbf;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.sub-total-label {
		font-size: 12px;
	}

	.corner .blank {
		border: 0;
		background: transparent;
	}

	.corner-label {
		font-weight: 700;
	}

	.total-amount .corner-label,
	.total-amount .num {
		background: #bfbfbf;
		font-weight: 800;
	}

	.note {
		margin-top: 6px;
		font-size: 10px;
		color: #555;
	}
</style>
