<script lang="ts">
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Download, Printer, Grid3x3 } from '@lucide/svelte';
	import { downloadCSV, printElement } from '$lib/print';
	import OrderSheet from './order-sheet.svelte';
	import { buildOrderSheet, orderSheetCsvRows } from '$lib/order-sheet';
	import { siteVatRate } from '$lib/siteSettings.svelte';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * The order laid out the way the factory writes it up: a numbered block per
	 * product, one row per cut, quantity × length totalled per block, then Sub
	 * Total and Grand Total / VAT / Total Amount. See $lib/order-sheet.
	 *
	 * It replaced a four-column per-product roll-up. The roll-up was correct and
	 * useless: staff pulling stock still had to rewrite it into this shape by
	 * hand, and the printout matched nothing the office files. Same numbers, in
	 * the layout the work is actually done in — and the CSV opens in Excel
	 * column-for-column against the sheet they already use.
	 */
	let {
		items,
		class: className = '',
		/** Render the title/hint row. Off inside the receipt, which has its own. */
		heading = false,
		/** Show Print / CSV buttons. Off inside the receipt, which exports itself. */
		exportable = false,
		fileName = 'dana-product-summary'
	}: {
		items: CartItem[];
		class?: string;
		heading?: boolean;
		exportable?: boolean;
		fileName?: string;
	} = $props();

	// Bound to the block that gets printed: title plus table, without the
	// export buttons themselves (they carry data-print-hide).
	let sheetNode: HTMLDivElement | null = $state(null);

	const orderSheet = $derived(buildOrderSheet(items, siteVatRate()));

	function savePdf() {
		if (sheetNode) printElement(sheetNode, { fileName, orientation: 'portrait' });
	}

	function saveCsv() {
		downloadCSV([[m.product_summary_title()], [], ...orderSheetCsvRows(orderSheet)], fileName);
	}
</script>

{#if orderSheet.sections.length > 0}
	<div bind:this={sheetNode} class={className}>
		{#if heading || exportable}
			<div class="mb-3 flex items-start justify-between gap-3">
				{#if heading}
					<div class="min-w-0">
						<h3 class="text-sm font-bold tracking-tight">{m.product_summary_title()}</h3>
						<p class="mt-0.5 text-xs text-muted-foreground">{m.product_summary_hint()}</p>
					</div>
				{/if}
				{#if exportable}
					<div class="shrink-0" data-print-hide>
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
					</div>
				{/if}
			</div>
		{/if}

		<div class="overflow-hidden rounded-xl border border-border">
			<OrderSheet {items} class="p-2" />
		</div>
	</div>
{/if}
