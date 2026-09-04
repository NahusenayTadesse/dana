<script lang="ts">
	import { setLocale } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';

	import { useCart } from '$lib/hooks/cart.svelte.js';

	import ProductCard from '$lib/components/product-card.svelte';

	// Set app and cart hooks
	useCart();
	let { data } = $props();

	import * as Carousel from '$lib/components/ui/carousel/index.js';

	import Hero from '$lib/components/hero.svelte';
	import Button from '$lib/components/ui/button/button.svelte';
	import { ArrowBigRight } from '@lucide/svelte';
	import BlogCard from '$lib/components/blogs/portfolio-card.svelte';
	import Home from '$lib/files/Home.svelte';

	// Keeps setLocale available without changing this page UI.
	void setLocale;
</script>

<svelte:head>
	<title>{m.home_meta_title()}</title>
</svelte:head>
<Hero />

<Home testimonials={data?.testimonialList}>




<section
	class="relative mx-auto flex max-w-7xl flex-col items-center justify-center overflow-hidden px-4 py-16 sm:px-6 lg:px-8"
>
	<div
		class="absolute top-0 left-1/2 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/5 opacity-60 blur-3xl"
	></div>

	<div class="mb-12 flex flex-col items-center gap-3 text-center">
		<span
			class="rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-[11px] font-bold tracking-widest text-primary uppercase backdrop-blur-sm"
		>
			{m.home_hotlist_badge()}
		</span>

		<h2
			class="bg-linear-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl"
		>
			{m.home_best_selling_products_title()}
		</h2>

		<p class="max-w-xl text-sm text-muted-foreground">
			{m.home_best_selling_products_description()}
		</p>
	</div>

	<div class="grid w-full max-w-6xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each data?.bestSelling.slice(0, 9) as product (product.productId)}
			<div
				class="group h-full rounded-2xl border border-primary/5 bg-card/40 p-1 backdrop-blur-md transition-all duration-500 hover:-translate-y-2 hover:border-primary/20 hover:bg-card/70 hover:shadow-[0_12px_30px_rgba(var(--primary),0.08)]"
			>
				<ProductCard {...product} />
			</div>
		{/each}
	</div>

	<Button href="/shop" size="lg" class="mt-10">
		{m.home_view_more_products()}
		<ArrowBigRight />
	</Button>
</section>

{#if data?.blogItems.length}
	<section class="w-full space-y-8 py-12">
		<div class="flex flex-col items-center space-y-2 text-center">
			<h2 class="text-3xl font-bold tracking-tight text-foreground">{m.home_blogs_title()}</h2>
			<p class="max-w-150 text-muted-foreground">
				{m.home_blogs_description()}
			</p>
		</div>

		<div class="relative px-12">
			<Carousel.Root opts={{ align: 'start', loop: true }} class="w-full">
				<Carousel.Content class="-ml-4">
					{#each data.blogItems as item (item.id)}
						<Carousel.Item class="basis-full pl-4 md:basis-1/2 lg:basis-1/3">
							<div class="h-full transition-all hover:scale-[1.01]">
								<BlogCard {item} />
							</div>
						</Carousel.Item>
					{/each}
				</Carousel.Content>

				<Carousel.Previous
					class="hidden border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground md:flex"
				/>
				<Carousel.Next
					class="hidden border-input bg-background text-foreground hover:bg-accent hover:text-accent-foreground md:flex"
				/>
			</Carousel.Root>
		</div>
	</section>
{/if}
  
</Home>





