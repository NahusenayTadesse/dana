<script lang="ts">
    import ProductDetail from '$lib/components/product-detail.svelte';
    import Gallery from '$lib/components/gallery.svelte';
    import * as m from '$lib/paraglide/messages.js';

    let { data } = $props();

    const productName = $derived(data?.product?.name ?? '');
    const productDesc = $derived(data?.product?.description ?? data?.product?.overview ?? '');

    // Schema.org dynamic injection metadata updated to reflect aggregate specifications
    const jsonLd = $derived({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: productName,
        image: data?.product?.featuredImage ? [`/files/${data.product.featuredImage}`, ...(data?.images ?? [])] : (data?.images ?? []),
        description: productDesc,
        brand: {
            '@type': 'Brand',
            name: data?.product?.brand || 'Dana Steels'
        },
        offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'ETB',
            offerCount: data?.priceList?.length || 0,
            lowPrice: data?.priceList?.[0]?.price ?? 0
        }
    });
</script>

<svelte:head>
    <title>{m.product_page_meta_title({ productName })}</title>
    <meta name="description" content={productDesc.substring(0, 160)} />

    <!-- OpenGraph Metadata Properties -->
    <meta property="og:type" content="product" />
    <meta property="og:title" content={m.product_page_og_title({ productName })} />
    <meta property="og:description" content={productDesc} />
    {#if data?.product?.featuredImage}
        <meta property="og:image" content="/files/{data.product.featuredImage}" />
    {/if}
    <meta property="product:price:currency" content="ETB" />

    <!-- Twitter Summary Card Engines -->
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:title" content={m.product_page_twitter_title({ productName })} />
    <meta property="twitter:description" content={productDesc.substring(0, 160)} />
    {#if data?.product?.featuredImage}
        <meta property="twitter:image" content="/files/{data.product.featuredImage}" />
    {/if}

    {@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
</svelte:head>

<div class="min-h-screen w-full pb-16 antialiased">
    <!-- Main Detailed Product Container Layout Component -->
    <section>
        <ProductDetail
            product={data.product}
            priceList={data.priceList}
            images={data.images}
            relatedProducts={data.relatedProducts}
        />
    </section>

    <!-- Fallback Additional Gallery Display Base Structure -->
    <!-- {#if data?.images && data.images.length > 0}
        <div class="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div class="mb-8 flex items-end justify-between border-b border-white/10 pb-5">
                <div>
                    <h2 class="text-2xl font-bold tracking-tight sm:text-3xl text-white">
                        Additional Batch Visuals
                    </h2>
                    <p class="mt-2 text-sm text-[#9BA7B6]">
                        High resolution structural verification files for {productName}
                    </p>
                </div>
                <span class="rounded-md border border-white/10 bg-[#141A22] px-2.5 py-1 font-mono text-xs font-medium tracking-widest text-[#6A7585] uppercase">
                    Frames: {data.images.length}
                </span>
            </div>

            <div class="rounded-2xl border border-white/10 bg-[#141A22]/50 p-6 shadow-md backdrop-blur-md">
                <Gallery images={data.images} title={productName} />
            </div>
        </div>
    {/if} -->
</div>