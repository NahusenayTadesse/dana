<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { MinusIcon, PlusIcon, TrashIcon } from '@lucide/svelte';
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { netOf, vatOf, grossOf } from '$lib/vat';
	import * as m from '$lib/paraglide/messages.js';

	const { item }: { item: CartItem } = $props();
	const cart = useCart();

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(price);
	};

	// Through $lib/vat rather than an inline 1.15/0.15: a rate may be quoted
	// either VAT-inclusive or VAT-exclusive, and this row has to agree with the
	// cart totals, the checkout summary and the server.
	const unitExclVat = $derived(netOf(Number(item.price), item.priceIncludesVat));
	const unitVat = $derived(vatOf(Number(item.price), item.priceIncludesVat));
	const lineTotal = $derived(grossOf(Number(item.price), item.priceIncludesVat) * item.quantity);

	const widthText = $derived(item.width != null ? `${item.width}${item.widthUnit ?? ''}` : null);
	const thicknessText = $derived(
		item.thickness != null
			? `${item.thickness}${item.thicknessUnit === 'gauge' ? ' ga' : (item.thicknessUnit ?? '')}`
			: null
	);
	const lengthText = $derived(
		item.length != null ? `${item.length}${item.lengthUnit ?? ''}` : null
	);

	const decreaseQuantity = () => cart.updateQuantity(item.lineId, item.quantity - 1);
	const increaseQuantity = () => cart.updateQuantity(item.lineId, item.quantity + 1);
	const removeItem = () => cart.removeItem(item.lineId);
</script>

<!--
	Stacked on a phone, a grid row from `sm` up — the same treatment
	buy-order-row.svelte already uses. This was a `<tr>` in a `min-w-[760px]`
	table inside a full-width drawer, which on a phone pushed the quantity
	stepper, the price, the line total and the delete button off-screen behind a
	horizontal scroll most people never find.
-->
<div
	class="grid grid-cols-1 gap-3 px-3 py-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto_minmax(0,7rem)_auto] sm:items-center sm:gap-4"
>
	<!-- Product, and on mobile the delete button sits beside it. -->
	<div class="flex items-center gap-3">
		{#if item.imageUrl}
			<img
				src="/files/{item.imageUrl}"
				alt={item.productName}
				class="size-12 shrink-0 rounded-lg border border-border object-cover"
			/>
		{:else}
			<div
				class="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-[9px] text-muted-foreground"
			>
				{m.checkout_col_no_image()}
			</div>
		{/if}
		<div class="min-w-0 flex-1">
			<div class="truncate font-semibold">{item.productName}</div>
			<div class="truncate text-xs text-muted-foreground">
				{item.sku ? `${m.checkout_col_sku()}: ${item.sku}` : `ID: ${item.productId}`}
			</div>
		</div>
		<div class="sm:hidden">
			{@render removeButton()}
		</div>
	</div>

	<!-- Spec: one line rather than four columns. The full per-axis breakdown
	     lives on /checkout and the printable receipt; the drawer is for a glance. -->
	<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm">
		{#if item.colorName}
			<span class="flex items-center gap-1.5">
				<span class="size-2.5 shrink-0 rounded-full border border-foreground/10 bg-primary/60"
				></span>
				{item.colorName}
			</span>
		{/if}
		{#if widthText}<span class="text-muted-foreground">{widthText}</span>{/if}
		{#if thicknessText}<span class="text-muted-foreground">{thicknessText}</span>{/if}
		{#if lengthText}
			<span class="text-muted-foreground">
				{lengthText}
				{#if item.isCustomLength}
					<span
						class="ml-1 rounded bg-amber-500/10 px-1 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
					>
						{m.product_detail_cut_to_order()}
					</span>
				{/if}
			</span>
		{/if}
		{#if !item.colorName && !widthText && !thicknessText && !lengthText}
			<span class="text-muted-foreground">—</span>
		{/if}
	</div>

	<div class="flex items-center justify-between gap-3 sm:justify-center">
		<span class="text-xs font-medium text-muted-foreground sm:hidden">{m.cart_col_qty()}</span>
		<div class="flex items-center gap-1.5">
			<Button size="icon" variant="outline" class="size-7" onclick={decreaseQuantity}>
				<MinusIcon class="size-3" />
			</Button>
			<span class="w-7 text-center text-sm font-semibold">{item.quantity}</span>
			<Button size="icon" variant="outline" class="size-7" onclick={increaseQuantity}>
				<PlusIcon class="size-3" />
			</Button>
		</div>
	</div>

	<!-- Unit price and line total together, so the arithmetic is visible instead
	     of split across two columns the reader has to reconcile. -->
	<div
		class="flex items-baseline justify-between gap-2 border-t border-border/40 pt-2 sm:block sm:border-0 sm:pt-0 sm:text-right"
	>
		<span class="text-xs text-muted-foreground sm:hidden">{m.cart_col_total()}</span>
		<div class="text-right">
			<div class="text-[11px] whitespace-nowrap text-muted-foreground">
				{formatPrice(unitExclVat)} × {item.quantity}
				{item.priceIncludesVat ? '' : ` · +${formatPrice(unitVat)} ${m.checkout_col_vat_short()}`}
			</div>
			<div class="font-semibold whitespace-nowrap">{formatPrice(lineTotal)}</div>
		</div>
	</div>

	<div class="hidden sm:block">
		{@render removeButton()}
	</div>
</div>

{#snippet removeButton()}
	<Button
		size="icon"
		variant="ghost"
		class="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
		onclick={removeItem}
		aria-label={m.buy_row_remove_line()}
	>
		<TrashIcon class="size-4" />
	</Button>
{/snippet}
