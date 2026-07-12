<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { ShoppingCartIcon, TrashIcon } from '@lucide/svelte';
	import CartItem from './cart-item.svelte';
	import * as Popover from '$lib/components/ui/sheet/index.js';
	import * as m from '$lib/paraglide/messages.js';

	let { header = false }: { header?: boolean } = $props();

	const cart = $derived(useCart());

	let open = $state(false);

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(price);
	};
</script>

<svelte:body style:overflow={cart.isOpen ? 'hidden' : 'auto'} />

<Popover.Root bind:open>
	<Popover.Trigger
		aria-label={m.cart_open_aria()}
		class={header
			? 'relative flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-foreground transition-all hover:bg-accent hover:text-accent-foreground'
			: 'fixed right-6 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 lg:bottom-6'}
	>
		<div class="relative flex items-center justify-center">
			<ShoppingCartIcon class="size-5" />
			{#if cart.totalItems > 0}
				<Badge
					variant="destructive"
					class="absolute -top-3 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full p-1 text-[10px] font-bold"
				>
					{cart.totalItems}
				</Badge>
			{/if}
		</div>
	</Popover.Trigger>

	<Popover.Content>
		<div class="flex items-center justify-between border-b border-border bg-muted/30 p-4">
			<div class="flex items-center gap-2">
				<ShoppingCartIcon class="size-5 text-primary" />
				<h3 class="font-semibold">{m.cart_title()}</h3>
			</div>
		</div>

		{#if cart.items.length > 0}
			<ScrollArea class="overscroll-behavior-contain min-h-0 flex-1">
				<div class="flex flex-col gap-2 p-3">
					{#each cart.items as item (item)}
						<CartItem {item} />
					{/each}
				</div>
			</ScrollArea>

			<div class="z-100 space-y-3 border-t border-border bg-muted p-4">
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">
						{m.cart_total_items({ count: cart.totalItems })}
					</span>
					<span class="text-lg font-bold text-primary">{formatPrice(cart.totalPrice)}</span>
				</div>
				<div class="flex gap-2">
					<Button variant="outline" size="sm" class="flex-1 gap-2" onclick={() => cart.clearCart()}>
						<TrashIcon class="size-4" />
						{m.cart_clear()}
					</Button>
					<Button size="sm" onclick={() => (open = false)} class="flex-1" href="/checkout">
						{m.cart_checkout()}
					</Button>
				</div>
			</div>
		{:else}
			<div class="p-8 text-center">
				<ShoppingCartIcon class="mx-auto mb-3 size-12 text-muted-foreground/50" />
				<p class="text-sm text-muted-foreground">{m.cart_empty_title()}</p>
				<p class="mt-1 text-xs text-muted-foreground/70">{m.cart_empty_description()}</p>
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
