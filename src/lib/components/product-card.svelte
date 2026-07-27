<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { ShoppingCartIcon, CheckIcon, ShoppingCart, Eye, Heart } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as m from '$lib/paraglide/messages.js';

	type Variant = {
		variantId: number;
		sku: string | null;
		price: string | number | null; // null = quote-only, no listed retail price
		quantity: number;
		imageUrl: string | null;
		colorId: number | null;
		colorName: string | null;
		colorHex: string | null;
		widthValue: string | number | null;
		widthUnit: string | null;
		widthLabel: string | null;
		thicknessValue: string | number | null;
		thicknessUnit: string | null;
		// Optional — only present if the shop query also joins `lengths`
		lengthValue?: string | number | null;
		lengthUnit?: string | null;
		lengthLabel?: string | null;
		isCustomLength?: boolean;
	};

	type ColorSwatch = { id: number | null; name: string | null; hex: string | null };

	type Props = {
		productId: number;
		productName: string;
		slug: string;
		image?: string | null;
		categoryName?: string | null;
		minPrice: number | null;
		maxPrice: number | null;
		hasQuoteOnlyVariant: boolean;
		totalQuantity: number;
		colorSwatches?: ColorSwatch[];
		variants?: Variant[];
	};

	let {
		productId,
		productName,
		slug,
		image,
		categoryName,
		minPrice,
		maxPrice,
		hasQuoteOnlyVariant,
		totalQuantity,
		colorSwatches = [],
		variants = []
	}: Props = $props();

	const cart = $derived(useCart());
	let justAdded = $state(false);

	function variantLabel(v: Variant) {
		const parts: string[] = [];
		if (v.colorName) parts.push(v.colorName);

		const widthPart = v.widthLabel || (v.widthValue ? `${v.widthValue}${v.widthUnit ?? ''}` : null);
		if (widthPart) parts.push(widthPart);

		const thicknessPart = v.thicknessValue ? `${v.thicknessValue}${v.thicknessUnit ?? ''}` : null;
		if (thicknessPart) parts.push(thicknessPart);

		const lengthPart =
			v.lengthLabel || (v.lengthValue ? `${v.lengthValue}${v.lengthUnit ?? ''}` : null);
		if (lengthPart) parts.push(v.isCustomLength ? `${lengthPart} (cut to order)` : lengthPart);

		return parts.length ? parts.join(' · ') : (v.sku ?? 'Standard');
	}

	// Default selection: the first variant that's both priced and in stock,
	// falling back to the first priced one, then just the first variant at all.
	const defaultVariant = $derived(
		variants.find((v) => v.price !== null && v.quantity > 0) ??
			variants.find((v) => v.price !== null) ??
			variants[0]
	);

	let selectedVariantId = $state<number | undefined>(defaultVariant?.variantId);

	const selectedVariant = $derived(
		variants.find((v) => v.variantId === selectedVariantId) ?? defaultVariant
	);

	const hasVariants = $derived(variants.length > 0);
	const displayImage = $derived(selectedVariant?.imageUrl || image);
	const isQuoteOnly = $derived(
		selectedVariant ? selectedVariant.price === null : hasQuoteOnlyVariant
	);
	const inStock = $derived(selectedVariant ? selectedVariant.quantity > 0 : totalQuantity > 0);
	const displayPrice = $derived(
		selectedVariant?.price != null ? Number(selectedVariant.price) : null
	);

	const quantityInCart = $derived(
		selectedVariant
			? (cart?.items.find((i) => i.variantId === selectedVariant.variantId)?.quantity ?? 0)
			: 0
	);

	function selectColorSwatch(colorId: number | null) {
		const match = variants.find((v) => v.colorId === colorId);
		if (match) selectedVariantId = match.variantId;
	}

	function addToCart() {
		if (justAdded || !selectedVariant || selectedVariant.price === null) return;

		cart.addItem({
			variantId: selectedVariant.variantId,
			productId,
			productName,
			sku: selectedVariant.sku,
			price: Number(selectedVariant.price),
			specLabel: variantLabel(selectedVariant),
			imageUrl: selectedVariant.imageUrl
		});

		justAdded = true;
		toast.success(m.product_card_added_to_cart({ productName }), {
			description: m.product_card_total_in_cart({ total: quantityInCart + 1 })
		});

		setTimeout(() => {
			justAdded = false;
		}, 1500);
	}
</script>

<div
	data-reveal
	class="group flex flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50 shadow-lg shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900 dark:shadow-2xl dark:shadow-black/40"
>
	<div class="relative h-49 overflow-hidden">
		{#if displayImage}
			<a href="/shop/single/{slug}" class="block h-full w-full">
				<img
					src="/files/{displayImage}"
					alt={productName}
					class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
				/>
			</a>
		{:else}
			<a
				href="/shop/single/{slug}"
				class="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-white/[0.02]"
			>
				<ShoppingCart class="size-10 text-slate-400/30 dark:text-slate-600/30" />
			</a>
		{/if}

		{#if categoryName}
			<span
				class="absolute top-3 left-3 rounded-full border border-slate-200/80 bg-white/80 px-2.5 py-1 font-mono text-[10px] tracking-widest text-slate-700 uppercase backdrop-blur-md dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-300"
			>
				{categoryName}
			</span>
		{/if}

		<div class="absolute top-3 right-3 flex gap-1.5">
			{#if quantityInCart > 0}
				<span
					class="flex items-center rounded-lg bg-blue-600 px-2.5 py-1 font-mono text-[10px] font-bold text-white dark:bg-blue-500"
				>
					{quantityInCart} In Cart
				</span>
			{/if}
			<button
				type="button"
				aria-label="Favorite Product"
				class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-700 backdrop-blur-md transition-colors hover:text-red-500 dark:border-white/15 dark:bg-slate-950/60 dark:text-slate-300 dark:hover:text-red-400"
			>
				<Heart size={14} />
			</button>
		</div>
	</div>

	<div class="flex flex-1 flex-col p-5">
		<div class="mb-2 flex items-center gap-1.5">
			<span
				class="text-[11.5px] font-bold {inStock
					? 'text-emerald-600 dark:text-emerald-400'
					: 'text-slate-400 dark:text-slate-500'}"
			>
				{inStock ? 'In stock' : 'Out of stock'}
			</span>
		</div>

		<h3 class="m-0 text-lg leading-snug font-bold text-slate-900 dark:text-white">
			<a
				href="/shop/single/{slug}"
				class="no-underline transition-colors hover:text-blue-600 dark:hover:text-blue-400"
			>
				{productName}
			</a>
		</h3>

		<!-- Price: a range until a specific variant is chosen, then the exact price -->
		<div class="mt-2 text-sm font-bold text-blue-600 dark:text-blue-400">
			{#if isQuoteOnly}
				Contact for quote
			{:else if displayPrice !== null}
				ETB {displayPrice?.toLocaleString()}
			{:else if minPrice !== null}
				{minPrice === maxPrice
					? `ETB ${minPrice?.toLocaleString()}`
					: `From ETB ${minPrice?.toLocaleString()}`}
			{:else}
				Contact for pricing
			{/if}
		</div>

		<!-- Color swatches — real hex values from the colors table, no more string guessing -->
		{#if colorSwatches.length > 0}
			<div class="mt-3 flex flex-wrap gap-1.5">
				{#each colorSwatches as sw (sw.id)}
					<button
						type="button"
						title={sw.name ?? ''}
						onclick={() => selectColorSwatch(sw.id)}
						class="h-4.5 w-4.5 rounded-md border transition-transform hover:scale-110 {selectedVariant?.colorId ===
						sw.id
							? 'border-blue-600 ring-2 ring-blue-500/40 dark:border-blue-400'
							: 'border-slate-300 dark:border-white/20'}"
						style:background-color={sw.hex ?? '#ccc'}
					></button>
				{/each}
			</div>
		{/if}

		<!-- Variant picker: color + width + thickness + length combo -->
		{#if hasVariants}
			<div class="mt-3 w-full">
				<Select
					type="single"
					value={selectedVariantId ? String(selectedVariantId) : undefined}
					onValueChange={(val) => (selectedVariantId = val ? Number(val) : undefined)}
				>
					<SelectTrigger
						class="h-auto w-full rounded-xl border border-slate-200 bg-white p-2 text-slate-900 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
					>
						<div class="flex w-full items-center justify-between gap-2 text-left">
							<div class="text-xs font-semibold text-slate-800 dark:text-slate-200">
								{selectedVariant ? variantLabel(selectedVariant) : 'Choose an option'}
							</div>
							{#if selectedVariant?.sku}
								<div class="font-mono text-[10px] text-slate-400">{selectedVariant.sku}</div>
							{/if}
						</div>
					</SelectTrigger>
					<SelectContent
						class="rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
					>
						{#each variants as v (v.variantId)}
							<SelectItem
								value={String(v.variantId)}
								class="cursor-pointer transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:focus:bg-white/5 dark:focus:text-white"
							>
								<div class="flex w-full items-center justify-between gap-6">
									<span class="text-xs">{variantLabel(v)}</span>
									<span class="text-xs font-bold text-blue-600 dark:text-blue-400">
										{v.price !== null ? `ETB ${Number(v.price).toLocaleString()}` : 'Quote'}
									</span>
								</div>
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
		{/if}

		<div class="mt-4.5 flex gap-2">
			{#if isQuoteOnly}
				<a
					href="/quote?productId={productId}{selectedVariant
						? `&variantId=${selectedVariant.variantId}`
						: ''}"
					class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 p-3 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
				>
					Request Quote
				</a>
			{:else}
				<button
					type="button"
					onclick={addToCart}
					disabled={justAdded || !selectedVariant}
					class="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-3 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-60 dark:from-blue-600 dark:to-blue-900"
				>
					{#if justAdded}
						<CheckIcon size={14} class="text-emerald-400" />
						Added
					{:else}
						<ShoppingCartIcon size={14} />
						Add To Cart
					{/if}
				</button>
			{/if}
			<a
				href="/shop/single/{slug}"
				class="flex w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
				title="View Sheet Specs"
			>
				<Eye size={16} />
			</a>
		</div>
	</div>
</div>
