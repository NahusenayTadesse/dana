<script lang="ts">
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import {
        ShareIcon,
        PlusIcon,
        CheckIcon,
        MinusIcon,
        ShoppingCart,
        Search,
        Eye,
        FileText,
        Layers
    } from '@lucide/svelte';
    import { toast } from 'svelte-sonner';
    import { useCart } from '$lib/hooks/cart.svelte.js';
    import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
    import * as m from '$lib/paraglide/messages.js';

    type Props = {
        product: {
            id: number;
            name: string;
            slug: string;
            brand: string | null;
            categoryId: number;
            categoryName?: string;
            featuredImage: string | null;
            description: string | null;
            overview: string | null;
            quantity: number;
            thickness: string | null;
            width: string | null;
            coatingType: string | null;
            colorOptions: string | null;
            sizeRange: string | null;
            finish: string | null;
            performanceFeatures: string | null;
            advantages: string | null;
            applications: string | null;
        };
        images: string[];
        priceList: { price: number | string; amount: number | string; imageUrl?: string }[];
        relatedProducts?: any[];
    };

    const {
        product,
        images = [],
        priceList = [],
        relatedProducts = []
    }: Props = $props();

    const cart = useCart();

    // Derived list uniting featured image, standard images, and price variant images (filtered & unique)
    const allGalleryImages = $derived.by(() => {
        const combined: string[] = [];
        
        if (product?.featuredImage) {
            combined.push(product.featuredImage);
        }
        
        if (Array.isArray(images)) {
            combined.push(...images);
        }

        if (Array.isArray(priceList)) {
            priceList.forEach((pkg) => {
                if (pkg.imageUrl) combined.push(pkg.imageUrl);
            });
        }

        // Return unique, non-empty image strings
        return Array.from(new Set(combined.filter(Boolean)));
    });

    // Handle initial state fallbacks safely
    let currentPrice = $state(priceList?.[0]?.price ?? 0);
    let currentAmount = $state(priceList?.[0]?.amount ?? 'Standard Option');
    let displayImage = $state(
        priceList?.[0]?.imageUrl || product?.featuredImage || (allGalleryImages.length ? allGalleryImages[0] : '')
    );
    let quantity = $state(1);
    let justAdded = $state(false);

    const numericPrice = $derived(typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice);
    const quantityInCart = $derived(cart.items.find((i) => i.productId === product.id)?.quantity ?? 0);
    const colors = $derived(product?.colorOptions ? product.colorOptions.split(',').map(c => c.trim()).filter(Boolean) : []);

    // Technical specifications key-value table builder mapping
    const specRows = $derived([
        { k: 'Thickness Range', v: product?.thickness || 'N/A' },
        { k: 'Standard Width', v: product?.width || 'N/A' },
        { k: 'Coating Classification', v: product?.coatingType || 'N/A' },
        { k: 'Available Finish', v: product?.finish || 'N/A' },
        { k: 'Size Profiles Available', v: product?.sizeRange || 'N/A' },
        { k: 'Brand Origin', v: product?.brand || 'Standard Industrial' }
    ]);

    // Parse text block for premium structural list rendering 
    const structuralAdvantages = $derived(
        product?.advantages 
            ? product.advantages.split('\n').filter(Boolean).map(line => {
                const parts = line.split(':');
                return parts.length > 1 
                    ? { title: parts[0].trim(), desc: parts[1].trim() }
                    : { title: 'Premium Feature', desc: line.trim() };
              })
            : [{ title: 'Engineered Standard', desc: 'Manufactured under rigid structural tolerances and safety constraints.' }]
    );

    function addToCart() {
        if (justAdded) return;

        cart.addItem({ 
            productId: product.id, 
            productName: product.name, 
            price: numericPrice, 
            amount: currentAmount,
            quantity: quantity 
        });
        justAdded = true;

        toast.success(m.product_detail_added_to_cart({ productName: product.name }), {
            description: `Added ${quantity} item(s) to order sheet.`
        });

        setTimeout(() => { justAdded = false; }, 1500);
    }

    function handleShare() {
        navigator.clipboard.writeText(window.location.href);
        toast.success(m.product_detail_link_copied());
    }

    function changePrice(pkg: { price: number | string; amount: number | string; imageUrl?: string }) {
        currentPrice = typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price;
        currentAmount = pkg.amount;

        if (pkg.imageUrl) {
            displayImage = pkg.imageUrl;
        }
    }

    // Matches color names/hex codes to gallery images or price variant images
    function handleColorClick(colorStr: string) {
        const query = colorStr.toLowerCase().replace('#', '').trim();

        // 1. First check priceList items for matching amount/name or image name
        const priceMatch = priceList.find(p => 
            p.imageUrl && (
                String(p.amount).toLowerCase().includes(query) ||
                p.imageUrl.toLowerCase().includes(query)
            )
        );

        if (priceMatch?.imageUrl) {
            changePrice(priceMatch);
            return;
        }

        // 2. Otherwise search inside all gallery image filenames
        const imgMatch = allGalleryImages.find(img => img.toLowerCase().includes(query));
        if (imgMatch) {
            displayImage = imgMatch;
        }
    }
</script>

<main class="mx-auto max-w-[1320px] px-7 pb-24 pt-11 text-slate-900 dark:text-slate-100">
    <!-- Breadcrumb Header -->
    <div class="mb-6 flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
        <a href="/" class="transition-colors hover:text-slate-900 dark:hover:text-white">Home</a>
        <span>/</span>
        <a href="/shop" class="transition-colors hover:text-slate-900 dark:hover:text-white">Products</a>
        <span>/</span>
        <span class="text-slate-700 dark:text-slate-300">{product.name}</span>
    </div>

    <!-- Product Layout Grid Split -->
    <div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
        
        <!-- Gallery Element Stack -->
        <div class="sticky top-24">
            <div class="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xl dark:border-white/10 dark:bg-slate-900/60 dark:shadow-2xl">
                {#if displayImage}
                    <img src="/files/{displayImage}" alt={product.name} class="h-[480px] w-full object-cover transition-all duration-300">
                {:else}
                    <div class="flex h-[480px] w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
                        <ShoppingCart size={48} class="text-slate-400/40 dark:text-slate-600/40" />
                    </div>
                {/if}
                <div class="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3.5 py-2 backdrop-blur-md dark:border-white/15 dark:bg-slate-950/60">
                    <span class="flex h-6.5 w-6.5 animate-spin items-center justify-center rounded-full border-1.5 border-dashed border-blue-600 dark:border-blue-500" style="animation-duration: 9s;">
                        <span class="h-1.5 w-1.5 rounded-full bg-blue-600 dark:bg-blue-500"></span>
                    </span>
                    <span class="font-mono text-[10.5px] tracking-widest text-slate-700 dark:text-slate-300">360° SPEC VIEW</span>
                </div>
            </div>
            
            <!-- Complete Combined Gallery Thumbnails (Featured + Gallery + Price Images) -->
            {#if allGalleryImages.length > 0}
                <div class="mt-3.5 grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {#each allGalleryImages as img}
                        <button 
                            type="button" 
                            class="h-20 overflow-hidden rounded-xl border-2 p-0 transition-all hover:opacity-90 {displayImage === img ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200 dark:border-white/10'}"
                            onclick={() => displayImage = img}
                        >
                            <img src="/files/{img}" alt="Product thumbnail option" class="h-full w-full object-cover">
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Meta Specification & Information Block Container -->
        <div>
            <span class="font-mono text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {product?.categoryName || 'Industrial Sheet'}
            </span>
            <h1 class="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-[40px]">
                {product.name}
            </h1>
            
            <div class="mt-3.5 flex items-center gap-3.5">
                <div class="flex items-center gap-1.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f4b400" stroke="none">
                        <path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17.3 5.7 20.6l1.6-6.9L2 9.1l7-.6z"/>
                    </svg>
                    <span class="text-sm font-bold text-slate-800 dark:text-slate-200">4.9</span>
                    <span class="text-xs text-slate-500 dark:text-slate-400">(Verified Batch Testing)</span>
                </div>
                <span class="flex items-center gap-1.5 text-xs font-bold {product.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-500'}">
                    <span class="h-2 w-2 rounded-full {product.quantity > 0 ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                    {product.quantity > 0 ? 'In stock · Material Available' : 'Out of stock'}
                </span>
            </div>
            
            <p class="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
                {product.overview || product.description}
            </p>

            <!-- Dynamic Pricing Options & Actions Drawer -->
            <div class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60">
                <div class="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                        <div class="font-mono text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Current Selection Price</div>
                        <div class="mt-1 text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                            {numericPrice > 0 ? `${numericPrice.toLocaleString()} ETB` : 'Price on request'}
                        </div>
                    </div>
                    <span class="max-w-[24ch] text-right text-xs text-slate-500 dark:text-slate-400">Volume discounts available for bulk & contractor orders</span>
                </div>

                <!-- Structured Option Switcher Select Grid Dropdown -->
                {#if priceList && priceList.length > 0}
                    <div class="mt-4">
                        <div class="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Select Dimension/Profile Pack</div>
                        <Select 
                            type="single" 
                            value={`${currentAmount}-${currentPrice}`}
                            onValueChange={(val) => {
                                const selected = priceList.find(pkg => `${pkg.amount}-${pkg.price}` === val);
                                if (selected) changePrice(selected);
                            }}
                        >
                            <SelectTrigger class="h-auto w-full border border-slate-200 bg-white p-3 text-slate-900 rounded-xl dark:border-white/10 dark:bg-slate-900 dark:text-white">
                                <div class="flex w-full items-center justify-between gap-2 text-left">
                                    <span class="text-sm font-semibold">{currentAmount}</span>
                                    <span class="text-sm font-bold text-blue-600 dark:text-blue-400">{numericPrice} ETB</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent class="border border-slate-200 bg-white text-slate-900 rounded-xl dark:border-white/10 dark:bg-slate-900 dark:text-white">
                                {#each priceList as pkg}
                                    <SelectItem 
                                        value={`${pkg.amount}-${pkg.price}`}
                                        class="cursor-pointer transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:focus:bg-white/5 dark:focus:text-white"
                                    >
                                        <div class="flex w-full items-center justify-between gap-12">
                                            <span class="text-xs font-medium">{pkg.amount}</span>
                                            <span class="text-xs font-bold text-blue-600 dark:text-blue-400">{pkg.price} ETB</span>
                                        </div>
                                    </SelectItem>
                                {/each}
                            </SelectContent>
                        </Select>
                    </div>
                {/if}

                <!-- Color Options Selection Swatches -->
                {#if colors.length > 0}
                    <div class="mt-4.5">
                        <div class="mb-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Color Profiles</div>
                        <div class="flex flex-wrap gap-2.5">
                            {#each colors as color}
                                <button
                                    type="button"
                                    class="h-8.5 w-8.5 rounded-lg border-2 transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500/50 {displayImage.toLowerCase().includes(color.toLowerCase().replace('#','')) ? 'border-blue-600 ring-2 ring-blue-500/40 dark:border-blue-400' : 'border-slate-300 dark:border-white/20'}"
                                    style="background: {color};"
                                    title={color}
                                    onclick={() => handleColorClick(color)}
                                ></button>
                            {/each}
                            <span class="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500 dark:border-white/30 dark:text-slate-400">RAL</span>
                        </div>
                    </div>
                {/if}

                <!-- Quantity Control Element Inline Wrapper -->
                <div class="mt-5 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-200/50 px-3.5 py-2 dark:border-white/5 dark:bg-black/20">
                    <span class="font-mono text-xs uppercase text-slate-500 dark:text-slate-400">Quantity Range</span>
                    <div class="flex items-center gap-3">
                        <button type="button" class="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onclick={() => quantity > 1 ? quantity-- : null}><MinusIcon size={14} /></button>
                        <span class="min-w-5 text-center font-mono text-sm font-bold">{quantity}</span>
                        <button type="button" class="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white" onclick={() => quantity++}><PlusIcon size={14} /></button>
                    </div>
                </div>

                <!-- Submission Actions Integration Row -->
                <div class="mt-5.5 flex flex-wrap gap-2.5">
                    <button 
                        type="button"
                        onclick={addToCart}
                        disabled={justAdded}
                        class="flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 transition-transform active:scale-95 disabled:opacity-50 dark:from-blue-600 dark:to-blue-900"
                    >
                        {#if justAdded}
                            <CheckIcon size={16} /> Order Form Added
                        {:else}
                            <ShoppingCart size={16} /> Add to Order Sheet
                        {/if}
                    </button>
                </div>
                
                <div class="mt-2.5 flex gap-2.5">
                    <button type="button" onclick={handleShare} class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">
                        Share Link
                    </button>
                </div>
            </div>

            <!-- Downloadable Resource Information Cards -->
            <div class="mt-4.5 flex flex-wrap gap-3">
                <div class="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-slate-900">
                    <span class="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-500">
                        <FileText size={17} />
                    </span>
                    <div>
                        <div class="text-sm font-bold text-slate-800 dark:text-slate-200">Technical Spec Sheet</div>
                        <div class="text-xs text-slate-500 dark:text-slate-400">PDF · Internal Specs</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Technical Specifications Metrics + Advantages Structural Row Split -->
    <div class="mt-16 grid grid-cols-1 gap-9 lg:grid-cols-2">
        <div>
            <h2 class="mb-5 text-2xl font-extrabold text-slate-900 dark:text-white">Technical Specifications</h2>
            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900">
                {#each specRows as row}
                    <div class="flex justify-between border-b border-slate-200/60 px-5 py-3.5 text-sm last:border-b-0 dark:border-white/5">
                        <span class="text-slate-500 dark:text-slate-400">{row.k}</span>
                        <span class="text-right font-semibold text-slate-800 dark:text-slate-200">{row.v}</span>
                    </div>
                {/each}
            </div>
            
            {#if product.applications}
                <h2 class="mb-4 mt-9 text-2xl font-extrabold text-slate-900 dark:text-white">Applications</h2>
                <p class="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {product.applications}
                </p>
            {/if}
        </div>
        
        <div>
            <h2 class="mb-5 text-2xl font-extrabold text-slate-900 dark:text-white">Advantages</h2>
            <div class="flex flex-col gap-3">
                {#each structuralAdvantages as adv}
                    <div class="flex gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900">
                        <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <CheckIcon size={14} strokeWidth={2.4} />
                        </span>
                        <div>
                            <div class="text-sm font-bold text-slate-900 dark:text-white">{adv.title}</div>
                            <div class="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{adv.desc}</div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Related Cross-Sell Sheet Products Grid Section -->
    {#if relatedProducts && relatedProducts.length > 0}
        <div class="mt-16">
            <h2 class="mb-5.5 text-2xl font-extrabold text-slate-900 dark:text-white">Related Products</h2>
            <div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
                {#each relatedProducts as p}
                    <a 
                        href="/shop/single/{p.id}" 
                        class="group block text-inherit no-underline"
                    >
                        <div class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-transform duration-300 group-hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900">
                            <div class="h-42 overflow-hidden">
                                <img src="/files/{p.featuredImage}" alt={p.name} class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105">
                            </div>
                            <div class="p-4">
                                <h3 class="truncate text-base font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400">{p.name}</h3>
                                <div class="mt-2 flex items-center justify-between">
                                    <span class="font-mono text-xs text-blue-600 dark:text-blue-400">{p.thickness || 'Specs'}</span>
                                    <span class="text-xs font-bold text-blue-600 dark:text-blue-400">View Specs →</span>
                                </div>
                            </div>
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    {/if}
</main>