<script lang="ts">
	import ProductDetail from '$lib/components/product-detail.svelte';
	import Gallery from '$lib/components/gallery.svelte';
	import Warranty from '$lib/components/warranty.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const productName = $derived(data?.product?.productName ?? '');

	const jsonLd = {
		'@context': 'https://schema.org/',
		'@type': 'Product',
		name: data?.product?.productName,
		image: [data?.product?.image, ...(data?.images ?? [])],
		description: data?.product?.description,
		brand: {
			'@type': 'Brand',
			name: 'dana Electronics'
		},
		offers: {
			'@type': 'AggregateOffer',
			lowPrice: data?.product?.price,
			priceCurrency: 'ETB',
			offerCount: data?.priceList?.length
		}
	};
</script>

<svelte:head>
	<title>{m.product_page_meta_title({ productName })}</title>
	<meta name="description" content={data?.product?.description?.substring(0, 160)} />

	<meta property="og:type" content="product" />
	<meta property="og:title" content={m.product_page_og_title({ productName })} />
	<meta property="og:description" content={data?.product?.description} />
	<meta property="og:image" content="/files/{data?.product?.image}" />
	<meta property="product:price:amount" content={data?.product?.price} />
	<meta property="product:price:currency" content="ETB" />

	<meta property="twitter:card" content="summary_large_image" />
	<meta property="twitter:title" content={m.product_page_twitter_title({ productName })} />
	<meta property="twitter:description" content={data?.product?.description?.substring(0, 160)} />
	<meta property="twitter:image" content="/files/{data?.product?.image}" />

	{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}<\/script>`}
</svelte:head>

<div
	class="min-h-screen w-full bg-background pb-16 text-foreground antialiased selection:bg-primary/20"
>
	<section class="border-b border-border bg-card/40 backdrop-blur-sm">
		<ProductDetail
			{...data?.product}
			priceList={data?.priceList}
			category={data?.category}
			tags={data?.tag}
			images={data?.images}
		/>
	</section>

	{#if data?.images?.length}
		<div class="mx-auto mt-16 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="mb-8 flex items-end justify-between border-b border-border pb-5">
				<div>
					<h2 class="text-2xl font-bold tracking-tight sm:text-3xl">
						{m.product_page_gallery_title()}
					</h2>
					<p class="mt-2 text-sm text-muted-foreground">
						{m.product_page_gallery_description({
							productName: data?.product?.productName || m.product_page_default_device()
						})}
					</p>
				</div>
				<span
					class="rounded-md border border-border bg-muted px-2.5 py-1 font-mono text-xs font-medium tracking-widest text-muted-foreground uppercase"
				>
					{m.product_page_gallery_frames({ count: data?.images?.length || 0 })}
				</span>
			</div>

			<div class="rounded-2xl border border-border bg-card/50 p-3 shadow-md backdrop-blur-md">
				<Gallery images={data?.images} title={data?.product?.productName} />
			</div>
		</div>
	{/if}
</div>

<Warranty />
