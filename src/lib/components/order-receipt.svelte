<script lang="ts">
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Download, Printer, Grid3x3 } from '@lucide/svelte';
	import { downloadCSV, printElement } from '$lib/print';
	import OrderLinesTable, { type OrderLine } from './order-lines-table.svelte';
	import OrderProductSummary from './order-product-summary.svelte';
	import { netOf, vatOf, grossOf } from '$lib/vat';
	import * as m from '$lib/paraglide/messages.js';

	let {
		items,
		reference = '',
		customer = null,
		fileName = 'dana-order-receipt',
		heading = ''
	}: {
		items: CartItem[];
		/** Order / quote number when one exists; blank for a not-yet-sent cart. */
		reference?: string;
		customer?: { name?: string | null; email?: string | null; phone?: string | null } | null;
		fileName?: string;
		heading?: string;
	} = $props();

	// The receipt lives off-screen (not display:none) so its images are already
	// decoded by the time the print sheet clones it.
	let receiptNode: HTMLDivElement | null = $state(null);

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	const lines = $derived(
		items.map((item) => {
			const unitNet = netOf(Number(item.price), item.priceIncludesVat);
			const unitGross = grossOf(Number(item.price), item.priceIncludesVat);
			return {
				item,
				unitNet,
				unitGross,
				lineNet: unitNet * item.quantity,
				lineVat: vatOf(Number(item.price), item.priceIncludesVat) * item.quantity,
				lineGross: unitGross * item.quantity
			};
		})
	);

	// Shape the cart lines for the shared table component.
	const tableLines = $derived<OrderLine[]>(
		lines.map((l) => ({
			productName: l.item.productName,
			colorName: l.item.colorName,
			width: l.item.width,
			widthUnit: l.item.widthUnit,
			thickness: l.item.thickness,
			thicknessUnit: l.item.thicknessUnit,
			length: l.item.length,
			lengthUnit: l.item.lengthUnit,
			quantity: l.item.quantity,
			unitPrice: l.unitNet,
			lineTotal: l.lineGross
		}))
	);

	// Same roll-up the on-sheet summary renders, flattened for the CSV.
	const productRollup = $derived.by(() => {
		const out: {
			productId: number;
			productName: string;
			variants: number;
			quantity: number;
			byUnit: { unit: string; total: number }[];
		}[] = [];

		for (const item of items) {
			let row = out.find((r) => r.productId === item.productId);
			if (!row) {
				row = {
					productId: item.productId,
					productName: item.productName,
					variants: 0,
					quantity: 0,
					byUnit: []
				};
				out.push(row);
			}
			row.variants += 1;
			row.quantity += item.quantity;
			if (item.length != null) {
				const unit = item.lengthUnit ?? '';
				const total = item.length * item.quantity;
				const entry = row.byUnit.find((u) => u.unit === unit);
				if (entry) entry.total += total;
				else row.byUnit.push({ unit, total });
			}
		}

		return out.map((r) => ({
			...r,
			lengthText:
				r.byUnit.length === 0
					? '—'
					: r.byUnit
							.map((u) => `${Number(u.total.toFixed(2))}${u.unit ? ` ${u.unit}` : ''}`)
							.join(' + ')
		}));
	});

	const subtotalExclVat = $derived(lines.reduce((s, l) => s + l.lineNet, 0));
	const vatTotal = $derived(lines.reduce((s, l) => s + l.lineVat, 0));
	const grandTotal = $derived(lines.reduce((s, l) => s + l.lineGross, 0));
	const totalQuantity = $derived(items.reduce((s, i) => s + i.quantity, 0));

	const issuedAt = $derived(new Date().toLocaleString());
	const title = $derived(heading || m.receipt_title());

	const dimension = (value: number | null, unit: string | null) =>
		value == null ? '—' : `${Number(value)}${unit ?? ''}`;

	function savePdf() {
		if (!receiptNode) return;
		printElement(receiptNode, { fileName, orientation: 'portrait' });
	}

	function saveCsv() {
		const rows: (string | number)[][] = [
			[title],
			[m.receipt_reference(), reference || m.receipt_not_submitted()],
			[m.receipt_issued(), issuedAt]
		];

		if (customer?.name) rows.push([m.receipt_customer(), customer.name]);
		if (customer?.email) rows.push([m.checkout_email_label(), customer.email]);
		if (customer?.phone) rows.push([m.checkout_phone_label(), customer.phone]);

		rows.push([]);
		rows.push([
			'#',
			m.cart_col_product(),
			m.checkout_col_color(),
			m.checkout_col_width(),
			m.checkout_col_thickness(),
			m.checkout_col_length(),
			m.cart_col_qty(),
			m.receipt_col_unit_excl_vat(),
			m.receipt_col_line_excl_vat(),
			m.receipt_col_line_vat(),
			m.receipt_col_line_total()
		]);

		lines.forEach((l, i) => {
			rows.push([
				i + 1,
				l.item.productName,
				l.item.colorName ?? '—',
				dimension(l.item.width, l.item.widthUnit),
				dimension(l.item.thickness, l.item.thicknessUnit),
				dimension(l.item.length, l.item.lengthUnit),
				l.item.quantity,
				l.unitNet.toFixed(2),
				l.lineNet.toFixed(2),
				l.lineVat.toFixed(2),
				l.lineGross.toFixed(2)
			]);
		});

		rows.push([]);
		rows.push([m.product_summary_title()]);
		rows.push([
			m.cart_col_product(),
			m.product_summary_variants(),
			m.cart_col_qty(),
			m.product_summary_total_length()
		]);
		productRollup.forEach((r) => rows.push([r.productName, r.variants, r.quantity, r.lengthText]));

		rows.push([]);
		rows.push([m.receipt_total_quantity(), totalQuantity]);
		rows.push([m.checkout_subtotal_excl_vat(), subtotalExclVat.toFixed(2)]);
		rows.push([m.checkout_vat_total(), vatTotal.toFixed(2)]);
		rows.push([m.checkout_grand_total(), grandTotal.toFixed(2)]);

		downloadCSV(rows, fileName);
	}
</script>

{#if items.length > 0}
	<DropdownMenu.Root>
		<DropdownMenu.Trigger>
			{#snippet child({ props })}
				<Button {...props} variant="outline" size="sm" class="gap-1.5 text-xs">
					<Download class="size-3.5" />
					{m.receipt_export()}
				</Button>
			{/snippet}
		</DropdownMenu.Trigger>
		<DropdownMenu.Content align="end" class="flex w-auto flex-col gap-2 p-2">
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<Button {...props} variant="default" onclick={savePdf}>
						<Printer class="size-4" />
						{m.receipt_save_pdf()}
					</Button>
				{/snippet}
			</DropdownMenu.Item>
			<DropdownMenu.Item>
				{#snippet child({ props })}
					<Button {...props} variant="default" onclick={saveCsv}>
						<Grid3x3 class="size-4" />
						{m.receipt_export_csv()}
					</Button>
				{/snippet}
			</DropdownMenu.Item>
		</DropdownMenu.Content>
	</DropdownMenu.Root>

	<!-- Off-screen printable receipt. Rendered (not hidden) so images decode
	     before the print sheet clones this node. -->
	<div class="receipt-source" aria-hidden="true">
		<div class="receipt" bind:this={receiptNode}>
			<header class="receipt-head">
				<img src="/logo.png" alt={m.header_logo_alt()} />
				<div class="receipt-head-meta">
					<h1>{title}</h1>
					<p>{m.receipt_reference()}: <strong>{reference || m.receipt_not_submitted()}</strong></p>
					<p>{m.receipt_issued()}: {issuedAt}</p>
				</div>
			</header>

			{#if customer && (customer.name || customer.email || customer.phone)}
				<section class="receipt-party">
					<h2>{m.receipt_billed_to()}</h2>
					{#if customer.name}<p>{customer.name}</p>{/if}
					{#if customer.email}<p>{customer.email}</p>{/if}
					{#if customer.phone}<p>{customer.phone}</p>{/if}
				</section>
			{/if}

			<OrderLinesTable lines={tableLines} />

			<section class="receipt-summary">
				<h2>{m.product_summary_title()}</h2>
				<OrderProductSummary {items} />
			</section>

			<section class="receipt-totals">
				<div><span>{m.receipt_total_quantity()}</span><span>{totalQuantity}</span></div>
				<div>
					<span>{m.checkout_subtotal_excl_vat()}</span><span>{formatPrice(subtotalExclVat)}</span>
				</div>
				<div><span>{m.checkout_vat_total()}</span><span>{formatPrice(vatTotal)}</span></div>
				<div class="grand">
					<span>{m.checkout_grand_total()}</span><span>{formatPrice(grandTotal)}</span>
				</div>
			</section>

			<footer class="receipt-foot">
				<p>{m.receipt_estimate_note()}</p>
				<p>{m.receipt_thanks()}</p>
			</footer>
		</div>
	</div>
{/if}

<style>
	/* Parked off-screen rather than display:none — a hidden subtree may never
	   load its images, and the printed receipt would lose the logo. */
	.receipt-source {
		position: fixed;
		top: 0;
		left: -10000px;
		width: 780px;
		pointer-events: none;
	}

	.receipt {
		background: #fff;
		color: #111;
		font-family: system-ui, sans-serif;
		padding: 8px;
	}

	.receipt-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		border-bottom: 2px solid #111;
		padding-bottom: 10px;
		margin-bottom: 14px;
	}

	.receipt-head img {
		height: 46px;
		width: auto;
		object-fit: contain;
	}

	.receipt-head-meta {
		text-align: right;
	}

	.receipt-head-meta h1 {
		font-size: 20px;
		font-weight: 800;
		letter-spacing: -0.01em;
	}

	.receipt-head-meta p {
		font-size: 11px;
		color: #555;
	}

	.receipt-party {
		margin-bottom: 14px;
		font-size: 12px;
	}

	.receipt-party h2 {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #666;
		margin-bottom: 3px;
	}

	.receipt-summary {
		margin-top: 14px;
	}

	.receipt-summary h2 {
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #666;
		margin-bottom: 4px;
	}

	.receipt-totals {
		margin-left: auto;
		margin-top: 14px;
		width: 300px;
		font-size: 12px;
	}

	.receipt-totals div {
		display: flex;
		justify-content: space-between;
		padding: 3px 0;
	}

	.receipt-totals .grand {
		border-top: 2px solid #111;
		margin-top: 4px;
		padding-top: 6px;
		font-size: 14px;
		font-weight: 800;
	}

	.receipt-foot {
		margin-top: 20px;
		border-top: 1px solid #d4d4d4;
		padding-top: 8px;
		font-size: 10px;
		color: #555;
	}
</style>
