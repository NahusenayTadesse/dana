<script lang="ts">
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Download, Printer, Grid3x3 } from '@lucide/svelte';
	import { downloadCSV, printElement } from '$lib/print';
	import OrderSheet from './order-sheet.svelte';
	import { buildOrderSheet, orderSheetCsvRows } from '$lib/order-sheet';
	import * as m from '$lib/paraglide/messages.js';
	import { siteImage } from '$lib/siteImages.svelte';

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

	const sheet = $derived(buildOrderSheet(items));

	const issuedAt = $derived(new Date().toLocaleString());
	const title = $derived(heading || m.receipt_title());

	function savePdf() {
		if (!receiptNode) return;
		printElement(receiptNode, { fileName, orientation: 'portrait' });
	}

	// The exported spreadsheet is the printed sheet: the same blocks, the same
	// per-block totals, the same Grand Total / VAT / Total Amount corner, under a
	// short header naming the order. Anything else and the file the office keeps
	// stops matching the paper it was filed against.
	function saveCsv() {
		const rows: (string | number | null | undefined)[][] = [
			[title],
			[m.receipt_reference(), reference || m.receipt_not_submitted()],
			[m.receipt_issued(), issuedAt]
		];

		if (customer?.name) rows.push([m.receipt_customer(), customer.name]);
		if (customer?.email) rows.push([m.checkout_email_label(), customer.email]);
		if (customer?.phone) rows.push([m.checkout_phone_label(), customer.phone]);

		rows.push([]);
		rows.push(...orderSheetCsvRows(sheet));

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
				<img src={siteImage('global.logo')} alt={m.header_logo_alt()} />
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

			<!-- The sheet carries the lines, the per-block totals and the Grand
			     Total / VAT / Total Amount corner, so the receipt adds no totals
			     block of its own — two sets of totals on one page is how a document
			     starts disagreeing with itself. -->
			<OrderSheet {items} />

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

	.receipt-foot {
		margin-top: 20px;
		border-top: 1px solid #d4d4d4;
		padding-top: 8px;
		font-size: 10px;
		color: #555;
	}
</style>
