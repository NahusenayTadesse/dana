<script lang="ts" module>
	/**
	 * The read-only "what's on this order" table, shared by the printable receipt
	 * and the payment page so column set, number alignment and spec formatting
	 * can't drift between the two documents a customer sees.
	 *
	 * The interactive checkout manifest deliberately does not use this: its rows
	 * carry quantity steppers and remove buttons, which is a different component
	 * with a different job (see floating-cart/cart-item-detailed.svelte).
	 *
	 * Nearly every field is nullable because these lines come from decimal DB
	 * columns (strings) and optional spec columns, not from a tidy view model.
	 */
	export type OrderLine = {
		productName: string | null;
		colorName?: string | null;
		width?: number | string | null;
		widthUnit?: string | null;
		thickness?: number | string | null;
		thicknessUnit?: string | null;
		length?: number | string | null;
		lengthUnit?: string | null;
		quantity: number;
		unitPrice: number;
		lineTotal: number;
	};
</script>

<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	let {
		lines,
		/**
		 * Narrow contexts (the payment card) fold the spec into the product cell
		 * instead of giving colour/width/thickness/length a column each.
		 */
		compact = false,
		unitPriceLabel = m.receipt_col_unit_excl_vat()
	}: { lines: OrderLine[]; compact?: boolean; unitPriceLabel?: string } = $props();

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	const dimension = (value: number | string | null | undefined, unit?: string | null) =>
		value == null || value === '' ? '—' : `${Number(value)}${unit ?? ''}`;

	/** Colour · width · thickness · length, blanks dropped. */
	const specLabel = (l: OrderLine) =>
		[
			l.colorName,
			l.width != null ? `${Number(l.width)}${l.widthUnit ?? ''}` : null,
			l.thickness != null
				? `${Number(l.thickness)}${l.thicknessUnit === 'gauge' ? 'ga' : (l.thicknessUnit ?? '')}`
				: null,
			l.length != null ? `${Number(l.length)}${l.lengthUnit ?? ''}` : null
		]
			.filter(Boolean)
			.join(' · ');
</script>

<table class="order-lines" class:compact>
	<thead>
		<tr>
			<th>#</th>
			<th>{m.cart_col_product()}</th>
			{#if !compact}
				<th>{m.checkout_col_color()}</th>
				<th>{m.checkout_col_width()}</th>
				<th>{m.checkout_col_thickness()}</th>
				<th>{m.checkout_col_length()}</th>
			{/if}
			<th class="num">{m.cart_col_qty()}</th>
			<th class="num">{unitPriceLabel}</th>
			<th class="num">{m.receipt_col_line_total()}</th>
		</tr>
	</thead>
	<tbody>
		{#each lines as l, i (i)}
			<tr>
				<td>{i + 1}</td>
				<td>
					{l.productName ?? '—'}
					{#if compact && specLabel(l)}
						<span class="spec">{specLabel(l)}</span>
					{/if}
				</td>
				{#if !compact}
					<td>{l.colorName ?? '—'}</td>
					<td>{dimension(l.width, l.widthUnit)}</td>
					<td>{dimension(l.thickness, l.thicknessUnit)}</td>
					<td>{dimension(l.length, l.lengthUnit)}</td>
				{/if}
				<td class="num">{l.quantity}</td>
				<td class="num">{formatPrice(l.unitPrice)}</td>
				<td class="num">{formatPrice(l.lineTotal)}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	.order-lines {
		width: 100%;
		border-collapse: collapse;
		font-size: 11px;
	}

	.order-lines.compact {
		font-size: 13px;
	}

	.order-lines th,
	.order-lines td {
		border: 1px solid #d4d4d4;
		padding: 5px 7px;
		text-align: left;
		vertical-align: top;
	}

	.order-lines thead th {
		background: #f1f1f1;
		font-weight: 700;
	}

	.order-lines .num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.spec {
		display: block;
		font-size: 0.85em;
		opacity: 0.7;
	}

	/* On screen the compact variant sits inside a themed card, so it borrows the
	   app's colours instead of the receipt's fixed print palette. */
	.order-lines.compact th,
	.order-lines.compact td {
		border-color: var(--border);
	}

	.order-lines.compact thead th {
		background: transparent;
		border-top: 0;
		border-left: 0;
		border-right: 0;
		font-size: 11px;
		text-transform: uppercase;
		color: var(--muted-foreground);
	}

	.order-lines.compact td {
		border-left: 0;
		border-right: 0;
	}
</style>
