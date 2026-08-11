<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { ScrollText as ReceiptIcon, TrashIcon, ArrowRight } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import CartRow from './cart-item-detailed.svelte';
	import * as Popover from '$lib/components/ui/sheet/index.js';
	import * as m from '$lib/paraglide/messages.js';

	// Only one Popover.Root/Content pair exists app-wide (rendered once,
	// globally, with header=false). Every `header={true}` usage (e.g. the nav
	// bar icon) is just a plain button that flips the shared cart.isOpen —
	// giving each its own Popover.Root would open several overlapping sheets
	// at once since they'd all be bound to the same boolean.
	let { header = false }: { header?: boolean } = $props();

	const cart = $derived(useCart());

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(price);
	};

	// Clearing used to be one unconfirmed tap on a button sitting right next to
	// Checkout — a mis-tap destroyed an order that took minutes to build, with
	// the cart overwritten in localStorage immediately after. Keep it one tap,
	// but make it reversible.
	function clearWithUndo() {
		const snapshot = [...cart.items];
		cart.clearCart();
		toast.success(m.cart_cleared_toast(), {
			duration: 10000,
			action: {
				label: m.cart_undo(),
				onClick: () => {
					for (const item of snapshot) {
						const { lineId: _lineId, quantity, ...rest } = item;
						cart.addItem(rest, quantity);
					}
				}
			}
		});
	}

	const triggerClass = $derived(
		header
			? 'relative flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background text-foreground transition-all hover:bg-accent hover:text-accent-foreground'
			: 'fixed right-6 bottom-24 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6'
	);
</script>

<svelte:body style:overflow={!header && cart.isOpen ? 'hidden' : 'auto'} />

{#if header}
	<button
		type="button"
		aria-label={m.cart_open_aria()}
		class={triggerClass}
		onclick={() => cart.toggle()}
	>
		<div class="relative flex items-center justify-center">
			<ReceiptIcon class="size-5" />
			{#if cart.totalItems > 0}
				<Badge
					variant="destructive"
					class="absolute -top-3 -right-3 flex h-5 min-w-5 items-center justify-center rounded-full p-1 text-[10px] font-bold"
				>
					{cart.totalItems}
				</Badge>
			{/if}
		</div>
	</button>
{:else}
	<Popover.Root bind:open={cart.isOpen}>
		<Popover.Trigger aria-label={m.cart_open_aria()} class={triggerClass}>
			<div class="relative flex items-center justify-center">
				<ReceiptIcon class="size-5" />
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

		<!--
            The sheet's own data-[side=right]:w-3/4 / sm:max-w-sm utilities sort
            after plain w-/max-w- classes in the generated CSS, so a class-only
            override loses the cascade no matter what order it's listed in here.
            An inline style wins regardless of utility ordering — "width: 100%"
            resolves against the fixed element's viewport-wide containing block,
            so this is min(100vw, 56rem): full-screen on mobile, capped on desktop.
        -->
		<Popover.Content class="flex flex-col gap-0 p-0" style="width: 100%; max-width: 56rem;">
			<div class="flex items-center justify-between border-b border-border bg-muted/30 p-4">
				<div class="flex items-center gap-2">
					<ReceiptIcon class="size-5 text-primary" />
					<h3 class="font-semibold">{m.cart_title()}</h3>
				</div>
			</div>

			{#if cart.items.length > 0}
				<ScrollArea class="overscroll-behavior-contain min-h-0 flex-1">
					<!-- min-w on the table + overflow-x-auto: no scroll needed once the
                         sheet is wide enough (desktop), but it's still there as a
                         fallback on narrow/small-laptop widths instead of clipping. -->
					<!-- Column headings only exist from `sm` up, where the rows line
                         up as a grid. Below that each row stacks and carries its own
                         labels, so there is nothing to scroll sideways to reach. -->
					<div class="p-1">
						<div
							class="hidden gap-4 border-b border-border px-3 py-2 text-xs text-muted-foreground uppercase sm:grid sm:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_auto_minmax(0,7rem)_auto]"
						>
							<span class="font-medium">{m.cart_col_product()}</span>
							<span class="font-medium">{m.buy_card_size()}</span>
							<span class="text-center font-medium">{m.cart_col_qty()}</span>
							<span class="text-right font-medium">{m.cart_col_total()}</span>
							<span class="w-8"></span>
						</div>

						<div class="divide-y divide-border/60">
							{#each cart.items as item (item.lineId)}
								<CartRow {item} />
							{/each}
						</div>
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
						<Button variant="outline" size="sm" class="flex-1 gap-2" onclick={clearWithUndo}>
							<TrashIcon class="size-4" />
							{m.cart_clear()}
						</Button>
						<Button size="sm" onclick={() => cart.close()} class="flex-1" href="/checkout">
							{m.cart_checkout()}
						</Button>
					</div>
				</div>
			{:else}
				<div class="p-8 text-center">
					<ReceiptIcon class="mx-auto mb-3 size-12 text-muted-foreground/50" />
					<p class="text-sm text-muted-foreground">{m.cart_empty_title()}</p>
					<p class="mt-1 mb-5 text-xs text-muted-foreground/70">{m.cart_empty_description()}</p>
					<Button href="/buy" onclick={() => cart.close()} class="gap-2">
						{m.cart_empty_cta()}
						<ArrowRight class="size-4" />
					</Button>
				</div>
			{/if}
		</Popover.Content>
	</Popover.Root>
{/if}
