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
    style="background: #151B24; border: 1px solid rgba(255,255,255,.09); border-radius: 18px; overflow: hidden; box-shadow: 0 14px 40px rgba(0,0,0,.28); display: flex; flex-direction: column;"
    class="group transition-all duration-300 hover:-translate-y-1"
>
    <!-- Card Visual Header Context -->
    <div style="position: relative; height: 196px; overflow: hidden;">
        {#if image}
            <a href="/shop/single/{productId}" style="display: block; width: 100%; height: 100%;">
                <img 
                    src="/files/{image}" 
                    alt={productName} 
                    style="width: 100%; height: 100%; object-fit: cover;"
                    class="transition-transform duration-700 group-hover:scale-105"
                />
            </a>
        {:else}
            <a href="/shop/single/{productId}" style="display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; background: rgba(255,255,255,0.02);">
                <ShoppingCart class="size-10 text-muted-foreground/20" />
            </a>
        {/if}

        <!-- Dynamic Category Sheet Tag -->
        {#if categoryName}
            <span style="position: absolute; top: 12px; left: 12px; font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; background: rgba(11,14,19,.62); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.14); color: #C7D0DB; padding: 5px 10px; border-radius: 100px;">
                {categoryName}
            </span>
        {/if}

        <!-- Interactive Utility Hover Controls -->
        <div style="position: absolute; top: 12px; right: 12px; display: flex; gap: 7px;">
            {#if quantityInCart > 0}
                <span style="font-family: 'Space Mono', monospace; font-size: 10px; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); padding: 5px 10px; border-radius: 8px; font-weight: bold; display: flex; align-items: center;">
                    {quantityInCart} In Cart
                </span>
            {/if}
            <button type="button" aria-label="Favorite Product" style="width: 32px; height: 32px; border-radius: 9px; background: rgba(11,14,19,.6); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,.14); display: flex; align-items: center; justify-content: center; color: #C7D0DB; cursor: pointer;">
                <Heart size={14} />
            </button>
        </div>
    </div>

    <!-- Main Dynamic Content Block Details -->
    <div style="padding: 18px 20px 20px; display: flex; flex-direction: column; flex: 1;">
        
        <!-- Inventory Stock Metrics Status Line -->
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f4b400" stroke="none">
                <path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17.3 5.7 20.6l1.6-6.9L2 9.1l7-.6z"/>
            </svg>
            <span style="font-size: 12px; font-weight: 700; color: #C7D0DB;">4.9</span>
            <span style="font-size: 11.5px; color: {quantity > 0 ? '#10B981' : '#6A7585'};">
                · {quantity > 0 ? 'In stock' : 'Out of Stock'}
            </span>
        </div>

        <!-- Sheet Profile Name Title Link -->
        <h3 style="font-family: 'Archivo', sans-serif; font-weight: 700; font-size: 18px; line-height: 1.2; margin: 0; color: #fff;">
            <a href="/shop/single/{productId}" style="color: inherit; text-decoration: none;" class="hover:text-primary transition-colors">
                {productName}
            </a>
        </h3>

        <!-- Dynamic Structural Dropdowns for Complex Unit Pricing Ranges -->
        <div style="margin-top: 12px;" class="w-full">
            <Select type="single" value={`${amount}-${price}`}>
                <SelectTrigger class="h-auto w-full border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-colors rounded-xl">
                    <div class="flex w-full items-center justify-between gap-2 text-left">
                        <div>
                            <div class="text-xs font-semibold text-gray-200">{amount}</div>
                            <div class="text-[10px] text-gray-400">Selected Option</div>
                        </div>
                        <div class="text-sm font-bold text-primary tabular-nums">ETB {price}</div>
                    </div>
                </SelectTrigger>
                <SelectContent class="border border-white/10 bg-[#151B24] text-white rounded-xl">
                    {#each priceList as pr (pr.amount)}
                        <SelectItem 
                            value={`${pr.amount}-${pr.price}`}
                            onclick={() => handlePriceChange(pr.amount, Number(pr.price))}
                            class="cursor-pointer transition-colors focus:bg-white/5 focus:text-white"
                        >
                            <div class="flex w-full items-center justify-between gap-6">
                                <span class="text-xs">{pr.amount}</span>
                                <span class="text-xs font-bold text-primary">ETB {pr.price}</span>
                            </div>
                        </SelectItem>
                    {/each}
                </SelectContent>
            </Select>
        </div>

        <!-- Engineering Gauge Sizing Specifications Metadata Row -->
        {#if thickness}
            <div style="margin-top: 14px; display: flex; gap: 12px; font-family: 'Space Mono', monospace; font-size: 11px; color: #7FA6FF;">
                <span>Thickness: {thickness}</span>
            </div>
        {/if}

        <!-- Hex Color Configuration Swatch Indicators Loop -->
        {#if colors.length > 0}
            <div style="margin-top: 12px; display: flex; gap: 6px; flex-wrap: wrap;">
                {#each colors as cl}
                    <span 
                        style="width: 18px; height: 18px; border-radius: 5px; background: {cl}; border: 1px solid rgba(255,255,255,.2);"
                        title={cl}
                    ></span>
                {/each}
            </div>
        {/if}

        <!-- Active Core Operations Submission Actions Button Drawer Row -->
        <div style="margin-top: 18px; display: flex; gap: 9px;">
            <button 
                type="button"
                onclick={addToCart}
                disabled={justAdded}
                style="flex: 1; background: linear-gradient(135deg, #3C74FF, #1B3A8C); color: #fff; border: none; padding: 12px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;"
                class="transition-all hover:opacity-90 active:scale-98 disabled:opacity-80"
            >
                {#if justAdded}
                    <CheckIcon size={14} class="text-green-400" />
                    Added
                {:else}
                    <ShoppingCartIcon size={14} />
                    Add To Cart
                {/if}
            </button>
            <a 
                href="/shop/single/{productId}" 
                style="width: 44px; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.14); border-radius: 10px; color: #C7D0DB; cursor: pointer; display: flex; align-items: center; justify-content: center;"
                class="hover:bg-white/10 transition-colors"
                title="View Sheet Specs"
            >
                <Eye size={16} />
            </a>
        </div>
    </div>
</div>