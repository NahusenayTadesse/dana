<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ShareIcon,
		PlusIcon,
		CheckIcon,
		LayersIcon,
		TagIcon,
		MinusIcon,
		ShoppingCart
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import * as m from '$lib/paraglide/messages.js';

	type Props = {
		productId: number;
		productName: string;
		price: number | string;
		description: string;
		image?: string;
		brand?: string;
		category?: string[];
		tags?: string[];
		images?: string[];
		priceList?: { price: number | string; amount: number | string }[];
	};

	const {
		productId,
		productName,
		price,
		description,
		image,
		brand = 'dana',
		category = [],
		tags = [],
		images = [],
		priceList = []
	}: Props = $props();

	let quantity = $state(1);

	const cart = useCart();

	let justAdded = $state(false);
	let currentPrice = $derived(typeof price === 'string' ? parseFloat(price) : price);
	let currentAmount = $derived(priceList?.[0]?.amount ?? '');
	let displayImage = $derived(image || (images.length ? images[0] : ''));

	const formatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'ETB'
	});

	const numericPrice = $derived(
		typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice
	);
	const formattedPrice = $derived(formatter.format(numericPrice));
	const quantityInCart = $derived(cart.items.find((i) => i.productId === productId)?.quantity ?? 0);

	function addToCart() {
		if (justAdded) return;

		cart.addItem({ productId, productName, price: numericPrice, amount: currentAmount });
		justAdded = true;

		toast.success(m.product_detail_added_to_cart({ productName }), {
			description: m.product_detail_total_in_cart({ total: quantityInCart + quantity })
		});

		setTimeout(() => {
			justAdded = false;
		}, 1500);
	}

	const handleShare = () => {
		navigator.clipboard.writeText(window.location.href);
		toast.success(m.product_detail_link_copied());
	};

	const incrementQuantity = () => {
		quantity += 1;
	};

	const decrementQuantity = () => {
		if (quantity > 1) quantity -= 1;
	};

	function changePrice(pkg: { price: number | string; amount: number | string }) {
		currentPrice = typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price;
		currentAmount = pkg.amount;
	}
</script>

<div
	class="relative min-h-screen bg-gradient-to-b from-background via-background/95 to-muted/30 antialiased selection:bg-primary/20"
>
	<div
		class="pointer-events-none absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]"
	></div>
	<div
		class="pointer-events-none absolute top-1/3 left-1/4 -z-10 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[120px]"
	></div>

	<div class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
		<div class="grid gap-8 lg:grid-cols-12 lg:gap-12">
			<div class="flex flex-col-reverse gap-4 lg:col-span-7 lg:flex-row">
				{#if images && images.length > 0}
					<div
						class="flex shrink-0 scrollbar-none flex-row gap-2.5 overflow-x-auto pb-2 lg:flex-col lg:overflow-x-visible lg:pb-0"
					>
						{#each images as img, i (i)}
							{@const isSelected = displayImage === img}
							<button
								class="relative aspect-square w-20 overflow-hidden rounded-xl border bg-card/60 p-1 backdrop-blur-sm transition-all duration-300 hover:scale-105
								{isSelected
									? 'border-primary shadow-md ring-2 ring-primary/20'
									: 'border-border hover:border-primary/40'}"
								aria-label={m.product_detail_view_image({ number: i + 1 })}
								onclick={() => (displayImage = img)}
							>
								<img
									src="/files/{img}"
									alt={m.product_detail_thumbnail_alt({ number: i + 1 })}
									class="h-full w-full rounded-lg object-cover"
								/>
							</button>
						{/each}
					</div>
				{/if}

				<div
					class="group relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-card/40 p-2 shadow-lg backdrop-blur-md lg:flex-1"
				>
					<div
						class="pointer-events-none absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-60"
					></div>
					<img
						src="/files/{displayImage}"
						alt={productName}
						class="h-full w-full rounded-xl object-contain transition-transform duration-500 ease-out group-hover:scale-102"
					/>

					{#if brand}
						<Badge
							class="absolute top-5 left-5 border-border bg-background/80 text-foreground shadow-sm backdrop-blur-md hover:bg-background/90"
						>
							{brand}
						</Badge>
					{/if}
				</div>
			</div>

			<div class="flex flex-col justify-between lg:col-span-5">
				<div class="space-y-6">
					{#if category?.length > 0}
						<div class="flex flex-wrap items-center gap-1.5">
							<LayersIcon class="mr-1 size-3.5 text-primary" />
							{#each category as cat}
								<span
									class="rounded bg-muted px-2 py-0.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase"
								>
									{cat}
								</span>
							{/each}
						</div>
					{/if}

					<div class="space-y-3">
						<h1
							class="bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl"
						>
							{productName}
						</h1>

						<div
							class="inline-flex items-center rounded-xl border border-primary/20 bg-primary/5 px-4 py-2 backdrop-blur-sm"
						>
							<span class="font-mono text-3xl font-black text-primary">
								{formattedPrice}
							</span>
						</div>
					</div>

					<div
						class="rounded-2xl border border-border bg-card/30 p-4 shadow-inner backdrop-blur-md"
					>
						<p class="text-sm leading-relaxed text-muted-foreground">
							{description}
						</p>
					</div>

					{#if priceList && priceList.length > 0}
						<div class="space-y-3">
							<h3
								class="flex items-center gap-1.5 text-xs font-bold tracking-widest text-muted-foreground uppercase"
							>
								<span>{m.product_detail_select_package_configuration()}</span>
							</h3>

							<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
								{#each priceList as pkg}
									{@const numPkgPrice =
										typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price}
									{@const isActive = currentPrice === numPkgPrice}

									<button
										onclick={() => changePrice(pkg)}
										class="group relative flex flex-col items-center justify-center rounded-xl border p-4 text-center transition-all duration-300 ease-out
										{isActive
											? 'scale-[1.02] border-primary bg-primary/5 shadow-md ring-1 ring-primary/30'
											: 'border-border bg-card/40 hover:border-primary/40 hover:bg-card/80'}"
									>
										<span class="text-base font-bold tracking-tight text-foreground">
											{pkg.amount}
										</span>

										<span class="mt-1 font-mono text-xs font-medium text-muted-foreground">
											{pkg.price} ETB
										</span>

										{#if isActive}
											<div
												class="absolute -top-1.5 right-2 rounded-full bg-primary p-0.5 text-primary-foreground shadow-sm"
											>
												<CheckIcon class="size-2.5" />
											</div>
										{/if}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					{#if tags?.length > 0}
						<div class="border-t border-border/60 pt-2">
							<div class="flex flex-wrap items-center gap-1.5">
								<TagIcon class="mr-1 size-3.5 text-muted-foreground" />
								{#each tags as tag}
									<Badge
										variant="outline"
										class="rounded-md border-border/80 bg-background/50 text-[11px] font-normal text-muted-foreground"
									>
										#{tag}
									</Badge>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<div class="mt-8 space-y-4 border-t border-border/80 pt-6">
					<div
						class="flex max-w-45 items-center justify-between rounded-xl border border-border bg-card/40 p-2 backdrop-blur-sm"
					>
						<span class="pl-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">
							{m.product_detail_quantity_short()}
						</span>
						<div
							class="flex items-center gap-1 rounded-lg border border-border bg-background/80 p-0.5 shadow-inner"
						>
							<Button
								variant="ghost"
								size="icon"
								onclick={decrementQuantity}
								class="size-7 rounded-md hover:bg-muted"
								disabled={quantity <= 1}
								aria-label={m.product_detail_decrease_quantity()}
							>
								<MinusIcon class="size-3" />
							</Button>
							<span class="w-7 text-center font-mono text-sm font-bold">{quantity}</span>
							<Button
								variant="ghost"
								size="icon"
								onclick={incrementQuantity}
								class="size-7 rounded-md hover:bg-muted"
								aria-label={m.product_detail_increase_quantity()}
							>
								<PlusIcon class="size-3" />
							</Button>
						</div>
					</div>

					<div class="flex flex-col gap-3 sm:flex-row">
						<Button
							class="h-12 flex-1 rounded-xl text-sm font-semibold tracking-wide shadow-md transition-all duration-300 active:scale-98"
							onclick={addToCart}
							variant={justAdded ? 'secondary' : 'default'}
							disabled={justAdded}
						>
							{#if justAdded}
								<CheckIcon class="mr-2 size-4 animate-bounce text-green-500" />
								{m.product_detail_item_saved_to_cart()}
							{:else}
								<ShoppingCart class="mr-2 size-4" />
								{m.product_detail_add_to_cart()}
							{/if}
						</Button>

						<Button
							variant="outline"
							class="h-12 gap-2 rounded-xl border-border bg-card/30 px-4 text-muted-foreground backdrop-blur-sm transition-all hover:text-foreground"
							onclick={handleShare}
						>
							<ShareIcon class="size-4" />
							<span class="sm:hidden lg:inline">{m.product_detail_share()}</span>
						</Button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
