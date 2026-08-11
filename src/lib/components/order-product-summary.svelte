<script lang="ts">
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Download, Printer, Grid3x3 } from '@lucide/svelte';
	import { downloadCSV, printElement } from '$lib/print';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * One row per product, with its length variants collapsed into a single
	 * quantity and a single total length.
	 *
	 * The order itself is kept as one line per length — 3 sheets at 2m and 2 at
	 * 3.5m are two different things to cut. But nobody loading a truck or pulling
	 * stock wants to add those up by hand, so this states the per-product figures
	 * directly.
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
	let sheet: HTMLDivElement | null = $state(null);

	type UnitTotal = { unit: string; total: number };

	/**
	 * Lengths are totalled per unit and only then stringified. A cart can hold
	 * metres and millimetres at once, and adding those two numbers together would
	 * produce a figure that means nothing.
	 */
	function addLength(into: UnitTotal[], length: number, unit: string) {
		const entry = into.find((u) => u.unit === unit);
		if (entry) entry.total += length;
		else into.push({ unit, total: length });
	}

	function lengthText(byUnit: UnitTotal[]): string {
		if (byUnit.length === 0) return '—';
		return byUnit
			.map((u) => `${Number(u.total.toFixed(2))}${u.unit ? ` ${u.unit}` : ''}`)
			.join(' + ');
	}

	const rows = $derived.by(() => {
		const out: {
			productId: number;
			productName: string;
			variants: number;
			quantity: number;
			byUnit: UnitTotal[];
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
			// Material, not row count: 4 sheets at 3m is 12m to cut.
			if (item.length != null) {
				addLength(row.byUnit, item.length * item.quantity, item.lengthUnit ?? '');
			}
		}

		return out;
	});

	const totalQuantity = $derived(rows.reduce((sum, r) => sum + r.quantity, 0));

	const totalByUnit = $derived.by(() => {
		const out: UnitTotal[] = [];
		for (const r of rows) for (const u of r.byUnit) addLength(out, u.total, u.unit);
		return out;
	});

	function savePdf() {
		if (sheet) printElement(sheet, { fileName, orientation: 'portrait' });
	}

	function saveCsv() {
		downloadCSV(
			[
				[m.product_summary_title()],
				[],
				[
					m.cart_col_product(),
					m.product_summary_variants(),
					m.cart_col_qty(),
					m.product_summary_total_length()
				],
				...rows.map((r) => [r.productName, r.variants, r.quantity, lengthText(r.byUnit)]),
				[],
				[m.product_summary_all_products(), items.length, totalQuantity, lengthText(totalByUnit)]
			],
			fileName
		);
	}
</script>

{#if rows.length > 0}
	<div bind:this={sheet} class={className}>
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

		<div class="overflow-x-auto rounded-xl border border-border">
			<table class="w-full text-sm">
				<caption class="sr-only">{m.product_summary_caption()}</caption>
				<thead>
					<tr class="border-b border-border bg-muted/40 text-left text-xs uppercase">
						<th class="px-3 py-2 font-medium">{m.cart_col_product()}</th>
						<th class="px-3 py-2 text-right font-medium">{m.product_summary_variants()}</th>
						<th class="px-3 py-2 text-right font-medium">{m.cart_col_qty()}</th>
						<th class="px-3 py-2 text-right font-medium">{m.product_summary_total_length()}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/60">
					{#each rows as row (row.productId)}
						<tr>
							<td class="px-3 py-2 font-medium">{row.productName}</td>
							<td class="px-3 py-2 text-right text-muted-foreground tabular-nums">{row.variants}</td
							>
							<td class="px-3 py-2 text-right font-semibold tabular-nums">
								{m.buy_pieces({ count: row.quantity })}
							</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums">{lengthText(row.byUnit)}</td>
						</tr>
					{/each}
				</tbody>
				{#if rows.length > 1}
					<tfoot>
						<tr class="border-t-2 border-border bg-muted/30 font-bold">
							<td class="px-3 py-2">{m.product_summary_all_products()}</td>
							<td class="px-3 py-2 text-right tabular-nums">{items.length}</td>
							<td class="px-3 py-2 text-right tabular-nums">
								{m.buy_pieces({ count: totalQuantity })}
							</td>
							<td class="px-3 py-2 text-right font-mono tabular-nums">{lengthText(totalByUnit)}</td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	</div>
{/if}
