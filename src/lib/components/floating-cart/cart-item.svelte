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

    // Structured spec chips (colour/width/thickness/length) — falls back to
    // the flat specLabel for carts saved before these fields existed.
    const specChips = $derived(
        [
            item.colorName,
            item.width != null ? `${item.width}${item.widthUnit ?? ''}` : null,
            item.thickness != null ? `${item.thickness}${item.thicknessUnit === 'gauge' ? 'ga' : (item.thicknessUnit ?? '')}` : null,
            item.length != null
                ? `${item.length}${item.lengthUnit ?? ''}${item.isCustomLength ? ` ${m.product_detail_cut_to_order()}` : ''}`
                : null
        ].filter((v): v is string => !!v)
    );

    const decreaseQuantity = () => {
        cart.updateQuantity(item.variantId, item.quantity - 1);
    };

    const increaseQuantity = () => {
        cart.updateQuantity(item.variantId, item.quantity + 1);
    };

    const removeItem = () => {
        cart.removeItem(item.variantId);
    };
</script>

<tr class="border-b border-border/50 align-top last:border-b-0">
    <td class="py-2.5 pr-2">
        <div class="font-medium">{item.productName}</div>
        <div class="text-xs text-muted-foreground">
            {item.sku ? `SKU: ${item.sku}` : `ID: ${item.productId}`}
        </div>
    </td>
    <td class="py-2.5 pr-2">
        {#if specChips.length > 0}
            <div class="flex flex-wrap gap-1">
                {#each specChips as chip}
                    <span
                        class="inline-flex items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20 ring-inset"
                    >
                        {chip}
                    </span>
                {/each}
            </div>
        {:else}
            <span class="text-xs text-muted-foreground">{item.specLabel}</span>
        {/if}
    </td>
    <td class="py-2.5 pr-2">
        <div class="flex items-center justify-end gap-1">
            <Button size="icon" variant="outline" class="size-6" onclick={decreaseQuantity}>
                <MinusIcon class="size-3" />
            </Button>
            <span class="w-6 text-center text-sm font-medium">{item.quantity}</span>
            <Button size="icon" variant="outline" class="size-6" onclick={increaseQuantity}>
                <PlusIcon class="size-3" />
            </Button>
        </div>
    </td>
    <td class="py-2.5 pr-2 text-right whitespace-nowrap">
        <div class="font-semibold text-primary">{formatPrice(item.price)}</div>
        {#if item.priceIncludesVat}
            <div class="text-[10px] text-muted-foreground">{m.cart_vat_included()}</div>
        {/if}
    </td>
    <td class="py-2.5 pr-2 text-right font-semibold whitespace-nowrap">
        {formatPrice(item.price * item.quantity)}
    </td>
    <td class="py-2.5 text-right">
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
