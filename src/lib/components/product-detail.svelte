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
        priceList: { price: number | string; amount: number | string }[];
        relatedProducts?: any[];
    };

    const {
        product,
        images = [],
        priceList = [],
        relatedProducts = []
    }: Props = $props();

    const cart = useCart();

    // Handle initial state fallbacks safely
    let currentPrice = $state(priceList?.[0]?.price ?? 0);
    let currentAmount = $state(priceList?.[0]?.amount ?? 'Standard Option');
    let displayImage = $state(product?.featuredImage || (images.length ? images[0] : ''));
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

    function changePrice(pkg: { price: number | string; amount: number | string }) {
        currentPrice = typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price;
        currentAmount = pkg.amount;
    }
</script>

<main style="max-width:1320px;margin:0 auto;padding:44px 28px 100px; color:#EEF2F7; background: #0B0E13;">
    <!-- Breadcrumb Header -->
    <div style="display:flex;align-items:center;gap:8px;font-size:13px;color:#6A7585;margin-bottom:26px;font-family:'Space Mono',monospace">
        <a href="/" style="color: inherit; text-decoration: none;">Home</a>
        <span>/</span>
        <a href="/shop" style="color: inherit; text-decoration: none;">Products</a>
        <span>/</span>
        <span style="color:#9BA7B6">{product.name}</span>
    </div>

    <!-- Product Layout Grid Split -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-[52px] items-start">
        
        <!-- Gallery Element Stack -->
        <div style="position:sticky;top:92px">
            <div style="position:relative;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 70px rgba(0,0,0,.45)">
                {#if displayImage}
                    <img src="/files/{displayImage}" alt={product.name} style="width:100%;height:480px;object-fit:cover">
                {:else}
                    <div style="width:100%;height:480px;background:#141A22;display:flex;align-items:center;justify-content:center;">
                        <ShoppingCart size={48} class="text-muted-foreground/10" />
                    </div>
                {/if}
                <div style="position:absolute;top:16px;right:16px;display:flex;align-items:center;gap:8px;background:rgba(11,14,19,.62);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.16);border-radius:100px;padding:8px 14px 8px 10px">
                    <span style="width:26px;height:26px;border-radius:50%;border:1.5px dashed #3C74FF;display:flex;align-items:center;justify-content:center;animation:spin 9s linear infinite">
                        <span style="width:5px;height:5px;border-radius:50%;background:#3C74FF"></span>
                    </span>
                    <span style="font-family:'Space Mono',monospace;font-size:10.5px;letter-spacing:.12em;color:#C7D0DB">360° SPEC VIEW</span>
                </div>
            </div>
            
            {#if images && images.length > 0}
                <div style="margin-top:14px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
                    {#each images as img}
                        <button 
                            type="button" 
                            style="border-radius:12px;overflow:hidden;border:1px solid rgba(255,255,255,.12);height:82px;cursor:pointer;background:none;padding:0;"
                            onclick={() => displayImage = img}
                        >
                            <img src="/files/{img}" alt="Thumbnail option" style="width:100%;height:100%;object-fit:cover">
                        </button>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- Meta Specification & Information Block Container -->
        <div>
            <span style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#7FA6FF">
                {product?.categoryName || 'Industrial Sheet'}
            </span>
            <h1 style="margin-top:12px;font-family:'Archivo',sans-serif;font-weight:800;font-size:clamp(28px,3.2vw,40px);line-height:1.08;letter-spacing:-.02em;color:#fff;">
                {product.name}
            </h1>
            
            <div style="margin-top:14px;display:flex;align-items:center;gap:14px">
                <div style="display:flex;align-items:center;gap:6px">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#f4b400" stroke="none">
                        <path d="m12 2 3 6.5 7 .6-5.3 4.6 1.6 6.9L12 17.3 5.7 20.6l1.6-6.9L2 9.1l7-.6z"/>
                    </svg>
                    <span style="font-weight:700;font-size:14px;color:#C7D0DB">4.9</span>
                    <span style="font-size:13px;color:#6A7585">(Verified Batch Testing)</span>
                </div>
                <span style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:700;color:{product.quantity > 0 ? '#3ddc84' : '#ef4444'}">
                    <span style="width:7px;height:7px;background:{product.quantity > 0 ? '#3ddc84' : '#ef4444'};border-radius:50%"></span>
                    {product.quantity > 0 ? 'In stock · Material Available' : 'Out of stock'}
                </span>
            </div>
            
            <p style="margin-top:20px;font-size:16px;line-height:1.7;color:#B7C2CF">
                {product.overview || product.description}
            </p>

            <!-- Dynamic Pricing Options & Actions Drawer -->
            <div style="margin-top:24px;background:rgba(20,26,34,.55);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:22px">
                <div style="display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px">
                    <div>
                        <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6A7585">Current Selection Price</div>
                        <div style="font-family:'Archivo',sans-serif;font-weight:800;font-size:28px;margin-top:4px;color:#3C74FF;">
                            {numericPrice > 0 ? `${numericPrice.toLocaleString()} ETB` : 'Price on request'}
                        </div>
                    </div>
                    <span style="font-size:12.5px;color:#8B96A5;max-width:24ch;text-align:right">Volume discounts available for bulk & contractor orders</span>
                </div>

                <!-- Structured Option Switcher Select Grid Dropdown -->
                {#if priceList && priceList.length > 0}
                    <div style="margin-top:16px;">
                        <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6A7585;margin-bottom:8px">Select Dimension/Profile Pack</div>
                        <Select type="single" value={`${currentAmount}-${currentPrice}`}>
                            <SelectTrigger class="h-auto w-full border border-white/10 bg-[#141A22] p-3 text-white rounded-xl">
                                <div class="flex w-full items-center justify-between gap-2 text-left">
                                    <span class="text-sm font-semibold">{currentAmount}</span>
                                    <span class="text-sm font-bold text-primary">{numericPrice} ETB</span>
                                </div>
                            </SelectTrigger>
                            <SelectContent class="border border-white/10 bg-[#151B24] text-white rounded-xl">
                                {#each priceList as pkg}
                                    <SelectItem 
                                        value={`${pkg.amount}-${pkg.price}`}
                                        onclick={() => changePrice(pkg)}
                                        class="cursor-pointer transition-colors focus:bg-white/5 focus:text-white"
                                    >
                                        <div class="flex w-full items-center justify-between gap-12">
                                            <span class="text-xs font-medium">{pkg.amount}</span>
                                            <span class="text-xs font-bold text-primary">{pkg.price} ETB</span>
                                        </div>
                                    </SelectItem>
                                {/each}
                            </SelectContent>
                        </Select>
                    </div>
                {/if}

                <!-- Color Options Selection Swatches -->
                {#if colors.length > 0}
                    <div style="margin-top:18px">
                        <div style="font-family:'Space Mono',monospace;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#6A7585;margin-bottom:10px">Color Profiles</div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap">
                            {#each colors as color}
                                <span 
                                    style="width:34px;height:34px;border-radius:9px;border:2px solid rgba(255,255,255,.2);background:{color};"
                                    title={color}
                                ></span>
                            {/each}
                            <span style="width:34px;height:34px;border-radius:9px;border:1.5px dashed rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:11px;color:#9BA7B6;">RAL</span>
                        </div>
                    </div>
                {/if}

                <!-- Quantity Control Element Inline Wrapper -->
                <div style="margin-top: 20px; display: flex; align-items: center; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 8px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <span style="font-family:'Space Mono',monospace;font-size:11px;text-transform:uppercase;color:#6A7585">Quantity Range</span>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <button type="button" class="text-gray-400 hover:text-white" onclick={() => quantity > 1 ? quantity-- : null}><MinusIcon size={14} /></button>
                        <span style="font-family:'Space Mono',monospace;font-size:14px;font-weight:bold;min-width:20px;text-align:center;">{quantity}</span>
                        <button type="button" class="text-gray-400 hover:text-white" onclick={() => quantity++}><PlusIcon size={14} /></button>
                    </div>
                </div>

                <!-- Submission Actions Integration Row -->
                <div style="margin-top:22px;display:flex;gap:10px;flex-wrap:wrap">
                    <button 
                        type="button"
                        onclick={addToCart}
                        disabled={justAdded || product.quantity === 0}
                        style="flex:1;min-width:180px;display:flex;align-items:center;justify-content:center;gap:9px;background:linear-gradient(135deg,#3C74FF,#1B3A8C);color:#fff;border:none;padding:15px;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;box-shadow:0 10px 30px rgba(60,116,255,.36);"
                        class="transition-transform active:scale-98 disabled:opacity-50"
                    >
                        {#if justAdded}
                            <CheckIcon size={16} /> Order Form Added
                        {:else}
                            <ShoppingCart size={16} /> Add to Order Sheet
                        {/if}
                    </button>
                </div>
                
                <div style="margin-top:10px;display:flex;gap:10px">
                    <button type="button" onclick={handleShare} style="flex:1;display:flex;align-items:center;justify-content:center;gap:8px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.14);color:#EEF2F7;padding:13px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">
                        Share Link
                    </button>
                </div>
            </div>

            <!-- Downloadable Resource Information Cards -->
            <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap;">
                <div style="flex:1;min-width:200px;display:flex;align-items:center;gap:12px;background:#141A22;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 16px;">
                    <span style="width:36px;height:36px;border-radius:9px;background:rgba(229,52,42,.15);border:1px solid rgba(229,52,42,.35);color:#ff7a72;display:flex;align-items:center;justify-content:center">
                        <FileText size={17} />
                    </span>
                    <div>
                        <div style="font-size:13.5px;font-weight:700">Technical Spec Sheet</div>
                        <div style="font-size:11.5px;color:#6A7585">PDF · Internal Specs</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Technical Specifications Metrics + Advantages Structural Row Split -->
    <div style="margin-top:64px;display:grid;grid-template-columns:1.3fr 1fr;gap:36px;" class="grid grid-cols-1 lg:grid-cols-2">
        <div>
            <h2 style="font-family:'Archivo',sans-serif;font-weight:800;font-size:24px;margin-bottom:20px;color:#fff;">Technical Specifications</h2>
            <div style="background:#141A22;border:1px solid rgba(255,255,255,.1);border-radius:16px;overflow:hidden">
                {#each specRows as row}
                    <div style="display:flex;justify-content:space-between;padding:15px 20px;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px">
                        <span style="color:#9BA7B6">{row.k}</span>
                        <span style="font-weight:600;color:#EEF2F7;text-align:right">{row.v}</span>
                    </div>
                {/each}
            </div>
            
            {#if product.applications}
                <h2 style="font-family:'Archivo',sans-serif;font-weight:800;font-size:24px;margin:36px 0 16px;color:#fff;">Applications</h2>
                <p style="font-size:15px;color:#B7C2CF;line-height:1.7;white-space:pre-line;">
                    {product.applications}
                </p>
            {/if}
        </div>
        
        <div>
            <h2 style="font-family:'Archivo',sans-serif;font-weight:800;font-size:24px;margin-bottom:20px;color:#fff;">Advantages</h2>
            <div style="display:flex;flex-direction:column;gap:12px">
                {#each structuralAdvantages as adv}
                    <div style="display:flex;gap:14px;background:#141A22;border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:16px 18px">
                        <span style="width:32px;height:32px;border-radius:9px;background:rgba(60,116,255,.16);border:1px solid rgba(60,116,255,.3);color:#7FA6FF;display:flex;align-items:center;justify-content:center;flex-shrink:0">
                            <CheckIcon size={14} strokeWidth={2.4} />
                        </span>
                        <div>
                            <div style="font-weight:700;font-size:14.5px;color:#fff;">{adv.title}</div>
                            <div style="font-size:13px;color:#9BA7B6;margin-top:3px;line-height:1.5">{adv.desc}</div>
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </div>

    <!-- Related Cross-Sell Sheet Products Grid Section -->
    {#if relatedProducts && relatedProducts.length > 0}
        <div style="margin-top:64px">
            <h2 style="font-family:'Archivo',sans-serif;font-weight:800;font-size:24px;margin-bottom:22px;color:#fff;">Related Products</h2>
            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:20px">
                {#each relatedProducts as p}
                    <a 
                        href="/shop/single/{p.id}" 
                        style="text-decoration:none; color:inherit; display:block;"
                        class="group"
                    >
                        <div style="background:#151B24;border:1px solid rgba(255,255,255,.09);border-radius:16px;overflow:hidden" class="transition-transform group-hover:-translate-y-1 duration-300">
                            <div style="height:170px;overflow:hidden">
                                <img src="/files/p.featuredImage" alt={p.name} style="width:100%;height:100%;object-fit:cover" class="transition-transform group-hover:scale-103 duration-500">
                            </div>
                            <div style="padding:16px 18px">
                                <h3 style="font-family:'Archivo',sans-serif;font-weight:700;font-size:16px;margin:0;color:#fff;" class="truncate group-hover:text-primary transition-colors">{p.name}</h3>
                                <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between">
                                    <span style="font-family:'Space Mono',monospace;font-size:11px;color:#7FA6FF">{p.thickness || 'Specs'}</span>
                                    <span style="font-size:12.5px;font-weight:700;color:#3C74FF">View Specs →</span>
                                </div>
                            </div>
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    {/if}
</main>

<style>
    /* Clean fallback spin utility injection for custom loading animations */
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
</style>