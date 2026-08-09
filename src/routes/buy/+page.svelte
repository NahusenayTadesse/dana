<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import BuyProductCard from '$lib/components/buy-product-card.svelte';
	import BuyOrderRow from '$lib/components/buy-order-row.svelte';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import { Button } from '$lib/components/ui/button';
	import { ShoppingBag, ArrowRight, Trash2, ReceiptText, PackageSearch } from '@lucide/svelte';

	let { data } = $props();
	const cart = useCart();

	// productId -> full listing row (with every variant), so a table row can
	// look up its own product's color/length options without a re-fetch.
	const productMap = $derived(new Map(data.productList.map((p) => [p.productId, p])));

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	const subtotalExclVat = $derived(
		cart.items.reduce((sum, item) => {
			const unitExclVat = item.priceIncludesVat ? item.price / 1.15 : item.price;
			return sum + unitExclVat * item.quantity;
		}, 0)
	);
	const vatTotal = $derived(
		cart.items.reduce((sum, item) => {
			const unitExclVat = item.priceIncludesVat ? item.price / 1.15 : item.price;
			const unitVat = item.priceIncludesVat ? item.price - unitExclVat : item.price * 0.15;
			return sum + unitVat * item.quantity;
		}, 0)
	);
	const grandTotal = $derived(subtotalExclVat + vatTotal);
</script>

<svelte:head>
	<title>Buy — Build Your Order</title>
	<meta name="description" content="Pick your products, set color, length and quantity, and see your total right here." />
</svelte:head>

<div class="min-h-screen bg-slate-50 pb-24 antialiased dark:bg-slate-950">
	<!-- Step-by-step banner, plain language, no jargon -->
	<header class="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
		<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<h1 class="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
				Build Your Order
			</h1>
			<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
				Everything happens on this one page — pick, customize, and see your total.
			</p>

			<div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
					<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">1</span>
					<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Pick a product below</span>
				</div>
				<div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
					<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">2</span>
					<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Set color, length &amp; quantity</span>
				</div>
				<div class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5">
					<span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">3</span>
					<span class="text-sm font-semibold text-slate-700 dark:text-slate-200">Send your order — no payment now</span>
				</div>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- 1. Products carousel -->
		<section>
			<h2 class="mb-4 text-lg font-extrabold text-slate-900 dark:text-white">Choose a Product</h2>

			{#if data.productList.length === 0}
				<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-slate-900 dark:text-slate-400">
					No products available right now.
				</div>
			{:else}
				<div class="relative px-1 sm:px-12">
					<Carousel.Root opts={{ align: 'start' }} class="w-full">
						<Carousel.Content>
							{#each data.productList as product (product.productId)}
								<Carousel.Item class="basis-[78%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
									<BuyProductCard
										productId={product.productId}
										productName={product.productName}
										slug={product.slug}
										image={product.image}
										categoryName={product.categoryName}
										minPrice={product.minPrice}
										maxPrice={product.maxPrice}
										hasQuoteOnlyVariant={product.hasQuoteOnlyVariant}
										variants={product.variants}
									/>
								</Carousel.Item>
							{/each}
						</Carousel.Content>
						<Carousel.Previous class="hidden sm:flex" />
						<Carousel.Next class="hidden sm:flex" />
					</Carousel.Root>
				</div>
			{/if}
		</section>

		<!-- 2. Your order: an editable receipt -->
		<section id="your-order" class="mt-12">
			<div class="mb-4 flex items-center justify-between">
				<h2 class="flex items-center gap-2 text-lg font-extrabold text-slate-900 dark:text-white">
					<ReceiptText class="size-5 text-blue-600 dark:text-blue-400" />
					Your Order
				</h2>
				{#if cart.items.length > 0}
					<Button variant="ghost" size="sm" class="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10" onclick={() => cart.clearCart()}>
						<Trash2 class="size-3.5" />
						Start over
					</Button>
				{/if}
			</div>

			{#if cart.items.length === 0}
				<div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-white/15 dark:bg-slate-900">
					<PackageSearch class="mb-3 size-10 stroke-[1.5] text-slate-300 dark:text-slate-700" />
					<p class="text-sm font-medium text-slate-500 dark:text-slate-400">Nothing added yet.</p>
					<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">Pick a product above to get started.</p>
				</div>
			{:else}
				<div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
					<table class="w-full min-w-[880px] border-collapse text-sm">
						<thead>
							<tr class="border-b border-slate-200 text-left text-xs text-slate-400 uppercase dark:border-white/10 dark:text-slate-500">
								<th class="px-4 py-3 font-bold">Product</th>
								<th class="px-4 py-3 font-bold">Color</th>
								<th class="px-4 py-3 font-bold">Width</th>
								<th class="px-4 py-3 font-bold">Thickness</th>
								<th class="px-4 py-3 font-bold">Length</th>
								<th class="px-4 py-3 text-center font-bold">Qty</th>
								<th class="px-4 py-3 text-right font-bold">Unit Price</th>
								<th class="px-4 py-3 text-right font-bold">Total</th>
								<th class="px-4 py-3"></th>
							</tr>
						</thead>
						<tbody class="px-4">
							{#each cart.items as item (item.variantId)}
								{@const product = productMap.get(item.productId)}
								<BuyOrderRow
									{item}
									variants={product?.variants ?? []}
									isLengthCustomizable={product?.isLengthCustomizable ?? false}
									minLength={product?.minLength ?? null}
									maxLength={product?.maxLength ?? null}
									lengthStep={product?.lengthStep ?? null}
								/>
							{/each}
						</tbody>
					</table>
				</div>

				<div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-end sm:justify-between dark:border-white/10">
					<div class="w-full space-y-2 rounded-2xl border border-slate-200 bg-white p-4 sm:w-80 dark:border-white/10 dark:bg-slate-900">
						<div class="flex justify-between text-sm">
							<span class="text-slate-500 dark:text-slate-400">Subtotal</span>
							<span class="font-mono font-medium">{formatPrice(subtotalExclVat)}</span>
						</div>
						<div class="flex justify-between text-sm">
							<span class="text-slate-500 dark:text-slate-400">VAT (15%)</span>
							<span class="font-mono font-medium">{formatPrice(vatTotal)}</span>
						</div>
						<div class="flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold dark:border-white/10">
							<span>Total</span>
							<span class="font-mono text-blue-600 dark:text-blue-400">{formatPrice(grandTotal)}</span>
						</div>
					</div>

					<Button href="/checkout" size="lg" class="h-14 w-full gap-2 rounded-xl text-base font-bold shadow-md sm:w-72">
						Send This Order
						<ArrowRight class="size-4" />
					</Button>
				</div>
				<p class="mt-3 text-center text-xs text-slate-400 sm:text-right dark:text-slate-500">
					Next step is just your name and phone number — no payment yet.
				</p>
			{/if}
		</section>
	</main>
</div>
