<script lang="ts">
    import ProductDetail from '$lib/components/product-detail.svelte';
    import Seo from '$lib/components/Seo.svelte';
    import * as m from '$lib/paraglide/messages.js';
    import { absoluteUrl, metaDescription, siteOrigin } from '$lib/seo';
    import { assetUrl } from '$lib/utils';

    let { data } = $props();

    const productName = $derived(data?.product?.name ?? '');
    const productDesc = $derived(
        metaDescription(data?.product?.description || data?.product?.overview, 5000)
    );

    const origin = siteOrigin();
    const productImages = $derived(
        [data?.product?.featuredImage, ...(data?.images ?? [])]
            .map((img) => assetUrl(img))
            .filter(Boolean)
    );

    // Only priced variants count as real "offers" — quote-only variants have no price
    const prices = $derived(
        (data?.variants ?? [])
            .filter((v) => v.price !== null)
            .map((v) => Number(v.price))
            .filter((price) => Number.isFinite(price) && price > 0)
    );

    // Product rich result. A price-less AggregateOffer is invalid for Google,
    // so quote-only products are described without offers.
    const jsonLd = $derived({
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Product',
                name: productName,
                url: `${origin}/shop/single/${encodeURIComponent(data?.product?.slug ?? '')}`,
                image: productImages.map((img) => absoluteUrl(img, origin)),
                description: productDesc || undefined,
                category: data?.product?.categoryName ?? undefined,
                brand: { '@type': 'Brand', name: data?.product?.brand || m.brand_name() },
                offers: prices.length
                    ? {
                          '@type': 'AggregateOffer',
                          priceCurrency: 'ETB',
                          offerCount: prices.length,
                          lowPrice: Math.min(...prices),
                          highPrice: Math.max(...prices),
                          availability: 'https://schema.org/InStock'
                      }
                    : undefined
            },
            {
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: m.breadcrumb_home(), item: `${origin}/` },
                    { '@type': 'ListItem', position: 2, name: m.product_detail_breadcrumb_products(), item: `${origin}/shop` },
                    { '@type': 'ListItem', position: 3, name: productName }
                ]
            }
        ]
    });
</script>

<Seo
    title={m.product_page_meta_title({ productName })}
    description={productDesc}
    image={productImages[0] ?? ''}
    type="product"
    {jsonLd}
/>

<svelte:head>
    <meta property="product:price:currency" content="ETB" />
    {#if prices.length}
        <meta property="product:price:amount" content={String(Math.min(...prices))} />
    {/if}
</svelte:head>

<div class="min-h-screen w-full pb-16 antialiased">
    <section>
        <ProductDetail
            product={data.product}
            images={data.images}
            imageColors={data.imageColors}
            variants={data.variants}
            relatedProducts={data.relatedProducts}
            accessories={data.accessories}
        />
    </section>
</div>