<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { MinusIcon, PlusIcon, TrashIcon } from '@lucide/svelte';
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import * as m from '$lib/paraglide/messages.js';

	const { item }: { item: CartItem } = $props();
	const cart = useCart();

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(price);
	};

	// Every priced item is quoted at its stored rate — VAT-inclusive rows
	// already have the 15% baked in, VAT-exclusive rows need it added on
	// top. Broken out per line so the buyer sees exactly what they're
	// paying for, not just a single opaque total.
	const unitExclVat = $derived(item.priceIncludesVat ? item.price / 1.15 : item.price);
	const unitVat = $derived(item.priceIncludesVat ? item.price - unitExclVat : item.price * 0.15);
	const lineExclVat = $derived(unitExclVat * item.quantity);
	const lineVat = $derived(unitVat * item.quantity);
	const lineTotal = $derived(lineExclVat + lineVat);

	const widthText = $derived(item.width != null ? `${item.width}${item.widthUnit ?? ''}` : null);
	const thicknessText = $derived(
		item.thickness != null
			? `${item.thickness}${item.thicknessUnit === 'gauge' ? ' ga' : (item.thicknessUnit ?? '')}`
			: null
	);
	const lengthText = $derived(item.length != null ? `${item.length}${item.lengthUnit ?? ''}` : null);

	const decreaseQuantity = () => cart.updateQuantity(item.variantId, item.quantity - 1);
	const increaseQuantity = () => cart.updateQuantity(item.variantId, item.quantity + 1);
	const removeItem = () => cart.removeItem(item.variantId);
</script>

<tr class="border-b border-border/60 align-top last:border-b-0">
	<td class="py-3 pr-3">
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
			<div class="min-w-0">
				<div class="font-semibold">{item.productName}</div>
				<div class="text-xs text-muted-foreground">
					{item.sku ? `${m.checkout_col_sku()}: ${item.sku}` : `ID: ${item.productId}`}
				</div>
			</div>
		</div>
	</td>

	<td class="py-3 pr-3 text-sm">
		{#if item.colorName}
			<span class="flex items-center gap-1.5">
				<span class="size-2.5 shrink-0 rounded-full border border-foreground/10 bg-primary/60"></span>
				{item.colorName}
			</span>
		{:else}
			<span class="text-muted-foreground">—</span>
		{/if}
	</td>

	<td class="py-3 pr-3 text-sm">{widthText ?? '—'}</td>

	<td class="py-3 pr-3 text-sm">{thicknessText ?? '—'}</td>

	<td class="py-3 pr-3 text-sm">
		{#if lengthText}
			{lengthText}
			{#if item.isCustomLength}
				<span class="ml-1 rounded bg-amber-500/10 px-1 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
					{m.product_detail_cut_to_order()}
				</span>
			{/if}
		{:else}
			<span class="text-muted-foreground">—</span>
		{/if}
	</td>

	<td class="py-3 pr-3">
		<div class="flex items-center justify-end gap-1.5">
			<Button size="icon" variant="outline" class="size-6" onclick={decreaseQuantity}>
				<MinusIcon class="size-3" />
			</Button>
			<span class="w-7 text-center text-sm font-semibold">{item.quantity}</span>
			<Button size="icon" variant="outline" class="size-6" onclick={increaseQuantity}>
				<PlusIcon class="size-3" />
			</Button>
		</div>
	</td>

	<td class="py-3 pr-3 text-right whitespace-nowrap">
		<div class="font-medium">{formatPrice(unitExclVat)}</div>
		<div class="text-[10px] text-muted-foreground">
			{item.priceIncludesVat ? m.cart_vat_included() : `+${formatPrice(unitVat)} ${m.checkout_col_vat_short()}`}
		</div>
	</td>

	<td class="py-3 pr-3 text-right font-semibold whitespace-nowrap">
		{formatPrice(lineTotal)}
	</td>

	<td class="py-3 text-right">
		<Button
			size="icon"
			variant="ghost"
			class="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
			onclick={removeItem}
		>
			<TrashIcon class="size-4" />
		</Button>
	</td>
</tr>
