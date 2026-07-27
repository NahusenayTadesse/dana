<script lang="ts">
    import ProductDetail from '$lib/components/product-detail.svelte';
    import * as m from '$lib/paraglide/messages.js';

    let { data } = $props();

    const productName = $derived(data?.product?.name ?? '');
    const productDesc = $derived(data?.product?.description ?? data?.product?.overview ?? '');

    // Only priced variants count as real "offers" — quote-only variants have no price
    const pricedVariants = $derived((data?.variants ?? []).filter((v) => v.price !== null));
    const lowPrice = $derived(
        pricedVariants.length ? Math.min(...pricedVariants.map((v) => Number(v.price))) : 0
    );

    // Schema.org dynamic injection metadata updated to reflect the variant matrix
    const jsonLd = $derived({
        '@context': 'https://schema.org/',
        '@type': 'Product',
        name: productName,
        image: data?.product?.featuredImage
            ? [`/files/${data.product.featuredImage}`, ...(data?.images ?? [])]
            : (data?.images ?? []),
        description: productDesc,
        brand: {
            '@type': 'Brand',
            name: data?.product?.brand || 'Dana Steels'
        },
        offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'ETB',
            offerCount: pricedVariants.length,
            lowPrice
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
    <section>
        <ProductDetail
            product={data.product}
            images={data.images}
            variants={data.variants}
            relatedProducts={data.relatedProducts}
        />
    </section>
</div>