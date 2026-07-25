<script lang="ts">
    import { useCart, type ProductPrice } from '$lib/hooks/cart.svelte.js';
    import { PackageIcon, CheckIcon, ShoppingCartIcon, ShoppingCart, Eye, Heart, Maximize2 } from '@lucide/svelte';
    import { toast } from 'svelte-sonner';
    import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
    import * as m from '$lib/paraglide/messages.js';

    type Props = {
        productId: number;
        productName: string;
        price: number | string;
        amount: number | string;
        image?: string;
        categoryName?: string;
        thickness?: string;
        colorOptions?: string;
        quantity?: number;
        priceList: ProductPrice[];
    };

    let { 
        productId, 
        productName, 
        price, 
        amount, 
        image, 
        categoryName, 
        thickness, 
        colorOptions, 
        quantity = 0,
        priceList 
    }: Props = $props();

    const cart = $derived(useCart());

    let justAdded = $state(false);
    const numericPrice = $derived(typeof price === 'string' ? parseFloat(price) : price);
    const quantityInCart = $derived(
        cart?.items.find((i) => i.productId === productId)?.quantity ?? 0
    );

    // Parse out comma-separated color strings into an array safely
    const colors = $derived(colorOptions ? colorOptions.split(',').map(c => c.trim()).filter(Boolean) : []);

    function addToCart() {
        if (justAdded) return;

        cart.addItem({ productId, amount, productName, price: numericPrice });
        justAdded = true;

        toast.success(m.product_card_added_to_cart({ productName }), {
            description: m.product_card_total_in_cart({ total: quantityInCart + 1 })
        });

        setTimeout(() => {
            justAdded = false;
        }, 1500);
    }

    const handlePriceChange = (newAmount: number | string, newPrice: number) => {
        amount = newAmount;
        price = newPrice;
    };
</script>

<div 
    data-reveal 
    class="group flex flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40"
>
    <!-- Card Visual Header Context -->
    <div class="relative h-49 overflow-hidden">
        {#if image}
            <a href="/shop/single/{productId}" class="block h-full w-full">
                <img 
                    src="/files/{image}" 
                    alt={productName} 
                    class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
            </a>
        {:else}
            <a href="/shop/single/{productId}" class="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-white/[0.02]">
                <ShoppingCart class="size-10 text-slate-400/30 dark:text-slate-600/30" />
            </a>
        {/if}

        <!-- Dynamic Category Sheet Tag -->
        {#if categoryName}
            <span class="absolute left-3 top-3 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase text-slate-700 backdrop-blur-md dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-300">
                {categoryName}
            </span>
        {/if}

        <!-- Interactive Utility Hover Controls -->
        <div class="absolute right-3 top-3 flex gap-1.5">
            {#if quantityInCart > 0}
                <span class="flex items-center rounded-lg bg-blue-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white dark:bg-blue-500">
                    {quantityInCart} In Cart
                </span>
            {/if}
            <button 
                type="button" 
                aria-label="Favorite Product" 
                class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-700 backdrop-blur-md transition-colors hover:text-red-500 dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:text-red-400"
            >
                <Heart size={14} />
            </button>
        </div>
    </div>

    <!-- Main Dynamic Content Block Details -->
    <div class="flex flex-1 flex-col p-5">
        
        <!-- Inventory Stock Metrics Status Line -->
        <div class="mb-2 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f4b400" stroke="none">
                <path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17.3 5.7 20.6l1.6-6.9L2 9.1l7-.6z"/>
            </svg>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200">4.9</span>
            <span class="text-[11.5px] {quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}">
                · {quantity > 0 ? 'In stock' : 'Out of Stock'}
            </span>
        </div>

        <!-- Sheet Profile Name Title Link -->
        <h3 class="m-0 text-lg font-bold leading-snug text-slate-900 dark:text-white">
            <a href="/shop/single/{productId}" class="no-underline transition-colors hover:text-blue-600 dark:hover:text-blue-400">
                {productName}
            </a>
        </h3>

        <!-- Dynamic Structural Dropdowns for Complex Unit Pricing Ranges -->
        <div class="mt-3 w-full">
            <Select type="single" value={`${amount}-${price}`}>
                <SelectTrigger class="h-auto w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                    <div class="flex w-full items-center justify-between gap-2 text-left">
                        <div>
                            <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">{amount}</div>
                            <div class="text-[10px] text-slate-500 dark:text-slate-400">Selected Option</div>
                        </div>
                        <div class="tabular-nums text-sm font-bold text-blue-600 dark:text-blue-400">ETB {price}</div>
                    </div>
                </SelectTrigger>
                <SelectContent class="rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white">
                    {#each priceList as pr (pr.amount)}
                        <SelectItem 
                            value={`${pr.amount}-${pr.price}`}
                            onclick={() => handlePriceChange(pr.amount, Number(pr.price))}
                            class="cursor-pointer transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:focus:bg-white/5 dark:focus:text-white"
                        >
                            <div class="flex w-full items-center justify-between gap-6">
                                <span class="text-xs">{pr.amount}</span>
                                <span class="text-xs font-bold text-blue-600 dark:text-blue-400">ETB {pr.price}</span>
                            </div>
                        </SelectItem>
                    {/each}
                </SelectContent>
            </Select>
        </div>

        <!-- Engineering Gauge Sizing Specifications Metadata Row -->
        {#if thickness}
            <div class="mt-3.5 flex gap-3 font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                <span>Thickness: {thickness}</span>
            </div>
        {/if}

        <!-- Hex Color Configuration Swatch Indicators Loop -->
        {#if colors.length > 0}
            <div class="mt-3 flex flex-wrap gap-1.5">
                {#each colors as cl}
                    <span 
                        class="h-4.5 w-4.5 rounded-md border border-slate-300 dark:border-white/20"
                        style="background: {cl};"
                        title={cl}
                    ></span>
                {/each}
            </div>
        {/if}

        <!-- Active Core Operations Submission Actions Button Drawer Row -->
        <div class="mt-4.5 flex gap-2">
            <button 
                type="button"
                onclick={addToCart}
                disabled={justAdded}
                class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-3 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-80 dark:from-blue-600 dark:to-blue-900"
            >
                {#if justAdded}
                    <CheckIcon size={14} class="text-emerald-400" />
                    Added
                {:else}
                    <ShoppingCartIcon size={14} />
                    Add To Cart
                {/if}
            </button>
            <a 
                href="/shop/single/{productId}" 
                class="flex w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
                title="View Sheet Specs"
            >
                <Eye size={16} />
            </a>
        </div>
    </div>
</div>