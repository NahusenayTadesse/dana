<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import BuyProductCard from '$lib/components/buy-product-card.svelte';
	import BuyOrderGroup from '$lib/components/buy-order-group.svelte';
	import BuyGuide from '$lib/components/buy-guide.svelte';
	import OrderReceipt from '$lib/components/order-receipt.svelte';
	import OrderProductSummary from '$lib/components/order-product-summary.svelte';
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight, Trash2, ReceiptText, PackageSearch, Plus } from '@lucide/svelte';
	import { netOf, vatOf, grossOf } from '$lib/vat';
	import { siteVatRate } from '$lib/siteSettings.svelte';

	const vatRate = $derived(siteVatRate());
	import { toast } from 'svelte-sonner';
	import { groupCartItems } from '$lib/cart-groups';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	const cart = useCart();

	// productId -> full listing row (with every variant), so a table row can
	// look up its own product's color/length options without a re-fetch.
	const productMap = $derived(new Map(data.productList.map((p) => [p.productId, p])));

	// Grouping lives in $lib/cart-groups so /checkout renders the identical
	// blocks — a line's ref ("B2") has to mean the same thing on both pages.
	const groups = $derived(groupCartItems(cart.items));

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	// Same reasoning as the cart drawer: keep "Start over" a single tap, but give
	// back an order that may have taken ten minutes to build.
	function clearWithUndo() {
		const snapshot = [...cart.items];
		cart.clearCart();
		toast.success(m.cart_cleared_toast(), {
			duration: 10000,
			action: {
				label: m.cart_undo(),
				onClick: () => cart.restoreItems(snapshot)
			}
		});
	}

	// Material, not row count: a line for 4 sheets at 3m is 12m to cut, so every
	// length below is length × quantity. Totalled per unit and only then
	// stringified — a cart can hold metres and millimetres at once, and adding
	// those two numbers together would produce a figure that means nothing.
	function totalLengthText(items: CartItem[]): string {
		const byUnit: { unit: string; total: number }[] = [];

		for (const i of items) {
			if (i.length == null) continue;
			const unit = i.lengthUnit ?? '';
			const entry = byUnit.find((u) => u.unit === unit);
			if (entry) entry.total += i.length * i.quantity;
			else byUnit.push({ unit, total: i.length * i.quantity });
		}

		if (byUnit.length === 0) return '—';
		return byUnit
			.map((u) => `${Number(u.total.toFixed(2))}${u.unit ? ` ${u.unit}` : ''}`)
			.join(' + ');
	}

	const sumQuantity = (items: CartItem[]) => items.reduce((sum, i) => sum + i.quantity, 0);

	const distinctProducts = $derived(
		cart.items.reduce<number[]>(
			(ids, i) => (ids.includes(i.productId) ? ids : [...ids, i.productId]),
			[]
		).length
	);

	const orderTotals = $derived({
		lines: cart.items.length,
		lengthText: totalLengthText(cart.items),
		quantity: sumQuantity(cart.items)
	});

	// Through $lib/vat, not a hand-rolled 1.15/0.15: those constants used to be
	// inlined here, so changing the rate would have updated the cart drawer,
	// the checkout summary, the receipt and the server while leaving this page
	// quoting the old one. The rate itself is now admin-set, which is exactly
	// why every surface has to read it from the same place.
	const subtotalExclVat = $derived(
		cart.items.reduce(
			(sum, item) => sum + netOf(Number(item.price), item.priceIncludesVat, vatRate) * item.quantity,
			0
		)
	);
	const vatTotal = $derived(
		cart.items.reduce(
			(sum, item) => sum + vatOf(Number(item.price), item.priceIncludesVat, vatRate) * item.quantity,
			0
		)
	);
	const grandTotal = $derived(
		cart.items.reduce(
			(sum, item) => sum + grossOf(Number(item.price), item.priceIncludesVat, vatRate) * item.quantity,
			0
		)
	);
</script>

<svelte:head>
	<title>{m.buy_meta_title()}</title>
	<meta name="description" content={m.buy_meta_description()} />
</svelte:head>

<div class="min-h-screen bg-slate-50 pb-24 antialiased dark:bg-slate-950">
	<!-- Step-by-step banner, plain language, no jargon -->
	<header class="border-b border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900">
		<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
			<h1 class="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
				{m.buy_heading()}
			</h1>
			<p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
				{m.buy_subheading()}
			</p>

			<div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<div
					class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5"
				>
					<span
						class="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
						>1</span
					>
					<span class="text-sm font-semibold text-slate-700 dark:text-slate-200"
						>{m.buy_step_one()}</span
					>
				</div>
				<div
					class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5"
				>
					<span
						class="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
						>2</span
					>
					<span class="text-sm font-semibold text-slate-700 dark:text-slate-200"
						>{m.buy_step_two()}</span
					>
				</div>
				<div
					class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-white/5"
				>
					<span
						class="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white"
						>3</span
					>
					<span class="text-sm font-semibold text-slate-700 dark:text-slate-200"
						>{m.buy_step_three()}</span
					>
				</div>
			</div>

			<BuyGuide products={data.productList} />
		</div>
	</header>

	<main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
		<!-- 1. Products carousel -->
		<section>
			<h2 class="mb-4 text-lg font-extrabold text-slate-900 dark:text-white">
				{m.buy_choose_product()}
			</h2>

			{#if data.productList.length === 0}
				<div
					class="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-slate-900 dark:text-slate-400"
				>
					{m.buy_no_products()}
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
					{m.buy_your_order()}
				</h2>
				{#if cart.items.length > 0}
					<div class="flex items-center gap-2">
						<OrderReceipt
							items={cart.items}
							fileName="dana-order-receipt"
							heading={m.receipt_order_heading()}
						/>
						<Button
							variant="ghost"
							size="sm"
							class="gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
							onclick={clearWithUndo}
						>
							<Trash2 class="size-3.5" />
							{m.buy_start_over()}
						</Button>
					</div>
				{/if}
			</div>

			{#if cart.items.length === 0}
				<div
					class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-white/15 dark:bg-slate-900"
				>
					<PackageSearch class="mb-3 size-10 stroke-[1.5] text-slate-300 dark:text-slate-700" />
					<p class="text-sm font-medium text-slate-500 dark:text-slate-400">
						{m.buy_empty_title()}
					</p>
					<p class="mt-1 text-xs text-slate-400 dark:text-slate-500">
						{m.buy_empty_hint()}
					</p>
				</div>
			{:else}
				<p class="mb-3 text-xs text-slate-400 dark:text-slate-500">
					{m.buy_blocks_hint_before()}
					<!-- The hint points at a button, so it shows that button: same
					     wording, same blue, so there is nothing to match up by memory. -->
					<span
						class="inline-flex items-center gap-0.5 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 align-middle text-[11px] font-bold text-blue-700 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300"
					>
						<Plus class="size-3" />
						{m.buy_row_add_word()}
					</span>
					{m.buy_blocks_hint_middle()}
					<span class="font-mono font-semibold text-slate-500 dark:text-slate-400">A1</span>
					{m.buy_blocks_hint_after()}
				</p>

				<div class="space-y-4">
					{#each groups as group (group.key)}
						{@const product = productMap.get(group.items[0].productId)}
						<BuyOrderGroup
							letter={group.letter}
							items={group.items}
							variants={product?.variants ?? []}
							isLengthCustomizable={product?.isLengthCustomizable ?? false}
							minLength={product?.minLength ?? null}
							maxLength={product?.maxLength ?? null}
							lengthStep={product?.lengthStep ?? null}
						/>
					{/each}
				</div>

				<section class="mt-6 border-t border-slate-200 pt-6 dark:border-white/10">
					<OrderProductSummary
						items={cart.items}
						heading
						exportable
						fileName="dana-order-summary"
					/>
				</section>

				<div
					class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-end sm:justify-between dark:border-white/10"
				>
					<!-- Every sum the order has, in one list, ending at the figure the
					     customer actually cares about. What is being ordered comes
					     first, what it costs second — the divider is the seam between
					     the two. -->
					<dl
						class="w-full rounded-2xl border border-slate-200 bg-white p-4 sm:w-96 dark:border-white/10 dark:bg-slate-900"
					>
						<div
							class="mb-2 text-xs font-bold tracking-wider text-slate-400 uppercase dark:text-slate-500"
						>
							{m.buy_summary_title()}
						</div>

						<div class="flex justify-between py-1 text-sm">
							<dt class="text-slate-500 dark:text-slate-400">{m.buy_summary_products()}</dt>
							<dd class="font-mono font-medium">{distinctProducts}</dd>
						</div>
						<div class="flex justify-between py-1 text-sm">
							<dt class="text-slate-500 dark:text-slate-400">{m.buy_summary_lines()}</dt>
							<dd class="font-mono font-medium">{orderTotals.lines}</dd>
						</div>
						<div class="flex justify-between py-1 text-sm">
							<dt class="text-slate-500 dark:text-slate-400">{m.buy_summary_quantity()}</dt>
							<dd class="font-mono font-medium">
								{m.buy_pieces({ count: orderTotals.quantity })}
							</dd>
						</div>
						<div class="flex justify-between gap-4 py-1 text-sm">
							<dt class="text-slate-500 dark:text-slate-400">{m.buy_summary_length()}</dt>
							<dd class="text-right font-mono font-medium">{orderTotals.lengthText}</dd>
						</div>

						<div class="my-2 border-t border-slate-200 dark:border-white/10"></div>

						<div class="flex justify-between py-1 text-sm">
							<dt class="text-slate-500 dark:text-slate-400">{m.checkout_subtotal_excl_vat()}</dt>
							<dd class="font-mono font-medium">{formatPrice(subtotalExclVat)}</dd>
						</div>
						<div class="flex justify-between py-1 text-sm">
							<dt class="text-slate-500 dark:text-slate-400">{m.checkout_vat_total({ rate: vatRate })}</dt>
							<dd class="font-mono font-medium">{formatPrice(vatTotal)}</dd>
						</div>

						<div
							class="mt-2 flex justify-between border-t border-slate-200 pt-2.5 text-base font-extrabold dark:border-white/10"
						>
							<dt>{m.cart_col_total()}</dt>
							<dd class="font-mono text-blue-600 dark:text-blue-400">
								{formatPrice(grandTotal)}
							</dd>
						</div>
					</dl>

					<Button
						href="/checkout"
						size="lg"
						class="h-14 w-full gap-2 rounded-xl text-base font-bold shadow-md sm:w-72"
					>
						{m.buy_send_order()}
						<ArrowRight class="size-4" />
					</Button>
				</div>
				<p class="mt-3 text-center text-xs text-slate-400 sm:text-right dark:text-slate-500">
					{m.buy_next_step_note()}
				</p>
			{/if}
		</section>
	</main>
</div>
