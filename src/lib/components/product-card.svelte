<script lang="ts">
	import { useCart, type ProductPrice } from '$lib/hooks/cart.svelte.js';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { PackageIcon, CheckIcon, ShoppingCartIcon, ShoppingCart } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as m from '$lib/paraglide/messages.js';

	type Props = {
		productId: number;
		productName: string;
		price: number | string;
		amount: number | string;
		image?: string;
		brand?: string;
		priceList: ProductPrice[];
	};

	let { productId, productName, price, amount, image, brand, priceList }: Props = $props();

	const cart = $derived(useCart());

	let justAdded = $state(false);
	const numericPrice = $derived(typeof price === 'string' ? parseFloat(price) : price);
	const quantityInCart = $derived(
		cart?.items.find((i) => i.productId === productId)?.quantity ?? 0
	);

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

<Card
	class="group relative overflow-hidden rounded-2xl border border-border/40 bg-background/40 shadow-lg backdrop-blur-md transition-all duration-500 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5"
>
	<div class="relative aspect-square overflow-hidden bg-muted/30">
		{#if image}
			<a href="/shop/single/{productId}" class="block h-full w-full p-2">
				<img
					src="/files/{image}"
					alt={productName}
					loading="lazy"
					class=" h-full w-full rounded-md object-cover transition-transform duration-700 ease-out group-hover:scale-105"
				/>
				<div
					class="absolute inset-0 bg-linear-to-t from-background/20 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
				></div>
			</a>
		{:else}
			<a href="/shop/single/{productId}" class="flex h-full w-full items-center justify-center">
				<div
					class="flex h-full w-full items-center justify-center text-muted-foreground/30 transition-transform duration-500 group-hover:scale-110"
				>
					<ShoppingCart class="size-12 stroke-[1.5]" />
				</div>
			</a>
		{/if}

		<div class="absolute inset-x-3 top-3 flex justify-between gap-2">
			{#if brand}
				<Badge
					variant="secondary"
					class="border border-white/10 bg-background/60 px-2.5 py-1 text-xs font-medium tracking-wide shadow-sm backdrop-blur-md dark:bg-black/40"
				>
					{brand}
				</Badge>
			{/if}

			{#if quantityInCart > 0}
				<Badge
					variant="default"
					class="animate-in bg-primary/90 px-2.5 py-1 font-semibold text-primary-foreground shadow-md backdrop-blur-sm duration-300 zoom-in-95"
				>
					{m.product_card_in_cart({ count: quantityInCart })}
				</Badge>
			{/if}
		</div>
	</div>

	<CardContent class="grid gap-4 p-3">
		<div class="flex flex-col gap-1">
			<h3
				class="line-clamp-1 text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary"
				title={productName}
			>
				{productName}
			</h3>
		</div>

		<div class="space-y-2">
			<label
				class="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground/80 uppercase"
			>
				<PackageIcon class="size-3.5 text-muted-foreground" />
				{m.product_card_package_options()}
			</label>

			<Select type="single" value={`${amount}-${price}`}>
				<SelectTrigger
					class="h-auto w-full rounded-xl border border-border/50 bg-muted/20 p-3 transition-all duration-300 hover:border-primary/40 hover:bg-muted/40 focus:ring-1 focus:ring-primary/30"
				>
					<div class="flex w-full items-center justify-between gap-3">
						<div class="flex min-w-0 items-center gap-3">
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10 text-primary"
							>
								<ShoppingCartIcon class="size-4.5" />
							</div>
							<div class="min-w-0 text-left leading-snug">
								<div class="truncate text-sm font-semibold text-foreground">{amount}</div>
								<div class="text-[11px] font-medium text-muted-foreground">
									{m.product_card_active_selection()}
								</div>
							</div>
						</div>

						<div class="shrink-0 text-right">
							<div class="text-sm font-bold text-primary tabular-nums">ETB {price}</div>
						</div>
					</div>
				</SelectTrigger>

				<SelectContent
					class="max-h-60 rounded-xl border border-border/40 bg-background/80 p-1.5 shadow-xl backdrop-blur-lg"
				>
					{#each priceList as newprice (newprice)}
						<SelectItem
							value={`${newprice.amount}-${newprice.price}`}
							onclick={() => handlePriceChange(newprice.amount, Number(newprice.price))}
							class="my-0.5 cursor-pointer rounded-lg px-3 py-2.5 transition-colors focus:bg-primary/10 focus:text-foreground"
						>
							<div class="flex w-full items-center justify-between gap-8">
								<div class="flex items-center gap-3">
									<div
										class="flex size-8 shrink-0 items-center justify-center rounded-md border border-muted-foreground/10 bg-muted/40"
									>
										<PackageIcon class="size-4 text-muted-foreground" />
									</div>
									<div class="text-left leading-tight">
										<div class="text-sm font-medium text-foreground">{newprice.amount}</div>
										<div class="text-[11px] text-muted-foreground">
											{m.product_card_standard_pack()}
										</div>
									</div>
								</div>
								<div class="shrink-0 text-right">
									<div class="text-sm font-bold text-primary">ETB {newprice.price}</div>
								</div>
							</div>
						</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		</div>
	</CardContent>

	<CardFooter class="p-5 pt-0">
		<Button
			class="w-full py-2"
			onclick={addToCart}
			variant={justAdded ? 'outline' : 'default'}
			disabled={justAdded}
		>
			{#if justAdded}
				<CheckIcon class="mr-2 size-4 animate-in text-green-500 duration-300 zoom-in-50" />
				{m.product_card_added_to_cart_button()}
			{:else}
				<ShoppingCart class="mr-2 size-4" />
				{m.product_card_add_to_cart()}
			{/if}
		</Button>
	</CardFooter>
</Card>
