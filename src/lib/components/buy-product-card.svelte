<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { PlusIcon, CheckIcon, ShoppingBag, MessageCircleQuestion } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';

	type Variant = {
		variantId: number;
		sku: string | null;
		price: string | number | null;
		quantity: number;
		imageUrl: string | null;
		colorId: number | null;
		colorName: string | null;
		colorHex: string | null;
		widthValue: string | number | null;
		widthUnit: 'mm' | 'cm' | 'm' | 'in' | 'ft' | null;
		widthLabel: string | null;
		thicknessValue: string | number | null;
		thicknessUnit: 'mm' | 'gauge' | null;
		lengthValue: string | number | null;
		lengthUnit: 'mm' | 'm' | 'ft' | null;
		lengthLabel: string | null;
		isCustomLength: boolean | null;
	};

	type Props = {
		productId: number;
		productName: string;
		slug: string;
		image?: string | null;
		categoryName?: string | null;
		minPrice: number | null;
		maxPrice: number | null;
		variants: Variant[];
	};

	// No hasQuoteOnlyVariant prop: whether the buyer is looking at a quote-only
	// option depends on the variant they have selected right now, which this
	// card resolves itself. A product-wide "some option somewhere has no price"
	// flag can't answer that question.
	const { productId, productName, slug, image, categoryName, minPrice, maxPrice, variants }: Props =
		$props();

	const cart = useCart();
	let justAdded = $state(false);

	// Decimal columns arrive as strings ("913.00", "0.425"), and "913.00mm" reads
	// like a machine wrote it. Number() drops the trailing zeros without
	// touching genuine decimals.
	const fmt = (value: string | number | null) => (value == null ? '' : String(Number(value)));

	// The very first thing a shopper sees for this product — pick the option
	// that's actually buyable right now, not just the first row in the table.
	const defaultVariant = $derived(
		variants.find((v) => v.price !== null && v.quantity > 0) ??
			variants.find((v) => v.price !== null) ??
			variants[0]
	);

	function variantLabel(v: Variant) {
		const parts: string[] = [];
		if (v.colorName) parts.push(v.colorName);
		const widthPart =
			v.widthLabel || (v.widthValue ? `${fmt(v.widthValue)}${v.widthUnit ?? ''}` : null);
		if (widthPart) parts.push(widthPart);
		const thicknessPart = v.thicknessValue
			? `${fmt(v.thicknessValue)}${v.thicknessUnit ?? ''}`
			: null;
		if (thicknessPart) parts.push(thicknessPart);
		const lengthPart =
			v.lengthLabel || (v.lengthValue ? `${fmt(v.lengthValue)}${v.lengthUnit ?? ''}` : null);
		if (lengthPart) parts.push(v.isCustomLength ? `${lengthPart} cut to order` : lengthPart);
		return parts.length ? parts.join(' · ') : (v.sku ?? m.buy_card_standard());
	}

	// --- Colour: the choice a roofing buyer actually makes ------------------
	//
	// Most products here carry 8 colours and only one size per colour, so
	// colour leads and size follows. It used to be the other way round: the
	// card showed a width/thickness dropdown and silently picked whatever
	// colour the "best" variant happened to be, with no way to change it short
	// of opening the product page.
	const colorOptions = $derived.by(() => {
		const out: { id: number; name: string; hex: string | null }[] = [];
		for (const v of variants) {
			if (v.colorId == null || out.some((c) => c.id === v.colorId)) continue;
			out.push({ id: v.colorId, name: v.colorName ?? m.buy_card_colour(), hex: v.colorHex });
		}
		return out;
	});

	const hasColorChoice = $derived(colorOptions.length > 0);

	let pickedColorId = $state<number | null>(null);

	// Falls back rather than being reset by an effect: an unset (or no longer
	// offered) colour resolves to the default variant's own.
	const selectedColorId = $derived(
		pickedColorId != null && colorOptions.some((c) => c.id === pickedColorId)
			? pickedColorId
			: (defaultVariant?.colorId ?? colorOptions[0]?.id ?? null)
	);

	const selectedColorName = $derived(
		colorOptions.find((c) => c.id === selectedColorId)?.name ?? null
	);

	// --- Size: width + thickness, but only when there's a real choice --------
	//
	// Grouped as one axis because not every width exists in every thickness —
	// offering them as two independent pickers would let a shopper build a
	// combination the factory doesn't make.
	function specKey(v: Variant) {
		return `${fmt(v.widthValue)}${v.widthUnit ?? ''}__${fmt(v.thicknessValue)}${v.thicknessUnit ?? ''}`;
	}

	function sizeLines(v: Variant) {
		const width =
			v.widthLabel ||
			(v.widthValue
				? m.buy_card_width_wide({ value: `${fmt(v.widthValue)}${v.widthUnit ?? ''}` })
				: null);
		const thickness = v.thicknessValue
			? m.buy_card_thickness_thick({
					value: `${fmt(v.thicknessValue)}${v.thicknessUnit === 'gauge' ? ' gauge' : (v.thicknessUnit ?? '')}`
				})
			: null;
		return { width, thickness };
	}

	const variantsInColor = $derived(
		selectedColorId == null ? variants : variants.filter((v) => v.colorId === selectedColorId)
	);

	const sizeOptions = $derived.by(() => {
		const out: { key: string; width: string | null; thickness: string | null; rep: Variant }[] = [];
		for (const v of variantsInColor) {
			const key = specKey(v);
			const existing = out.find((o) => o.key === key);
			// Best representative for the pill: priced and in stock beats priced
			// beats whatever came first.
			if (existing) {
				const better =
					existing.rep.price === null ||
					(existing.rep.quantity <= 0 && v.price !== null && v.quantity > 0);
				if (better && v.price !== null) existing.rep = v;
				continue;
			}
			out.push({ key, ...sizeLines(v), rep: v });
		}
		return out;
	});

	const hasSizeChoice = $derived(sizeOptions.length > 1);

	let pickedSizeKey = $state<string | undefined>(undefined);

	// Same fallback shape as colour: a size that this colour doesn't come in
	// resolves to the first one that it does, so switching colour can never
	// leave the card pointing at nothing.
	const selectedSize = $derived(
		sizeOptions.find((o) => o.key === pickedSizeKey) ?? sizeOptions[0] ?? null
	);

	const selectedVariant = $derived(selectedSize?.rep ?? defaultVariant);

	const isQuoteOnly = $derived(!selectedVariant || selectedVariant.price === null);
	const inStock = $derived((selectedVariant?.quantity ?? 0) > 0);

	// How many of this exact thing are already on the order — plain reassurance
	// that the last tap did something.
	const alreadyOnOrder = $derived(
		selectedVariant ? cart.quantityOfVariant(selectedVariant.variantId) : 0
	);

	function addToOrder() {
		if (justAdded || !selectedVariant || selectedVariant.price === null) return;

		cart.addItem({
			variantId: selectedVariant.variantId,
			productId,
			productName,
			sku: selectedVariant.sku,
			price: Number(selectedVariant.price),
			priceIncludesVat: false,
			colorId: selectedVariant.colorId,
			colorName: selectedVariant.colorName,
			width: selectedVariant.widthValue != null ? Number(selectedVariant.widthValue) : null,
			widthUnit: selectedVariant.widthUnit,
			thickness:
				selectedVariant.thicknessValue != null ? Number(selectedVariant.thicknessValue) : null,
			thicknessUnit: selectedVariant.thicknessUnit,
			length: selectedVariant.lengthValue != null ? Number(selectedVariant.lengthValue) : null,
			lengthUnit: selectedVariant.lengthUnit,
			isCustomLength: selectedVariant.isCustomLength ?? false,
			specLabel: variantLabel(selectedVariant),
			imageUrl: selectedVariant.imageUrl
		});

		justAdded = true;
		toast.success(m.buy_card_added_toast({ product: productName }), {
			description: m.buy_card_added_toast_description()
		});
		setTimeout(() => (justAdded = false), 1500);
	}
</script>

<div
	class="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900"
>
	<a
		href="/shop/single/{slug}"
		class="block h-44 shrink-0 overflow-hidden bg-slate-100 dark:bg-white/[0.03]"
	>
		{#if selectedVariant?.imageUrl || image}
			<img
				src="/files/{selectedVariant?.imageUrl || image}"
				alt={productName}
				class="h-full w-full object-cover"
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<ShoppingBag class="size-9 text-slate-300 dark:text-slate-700" />
			</div>
		{/if}
	</a>

	<div class="flex flex-1 flex-col p-4">
		{#if categoryName}
			<span
				class="mb-1 font-mono text-[10px] font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400"
			>
				{categoryName}
			</span>
		{/if}
		<h3 class="text-base leading-snug font-bold text-slate-900 dark:text-white">
			<a
				href="/shop/single/{slug}"
				class="no-underline hover:text-blue-600 dark:hover:text-blue-400"
			>
				{productName}
			</a>
		</h3>

		<div class="mt-1.5 flex items-baseline gap-1.5">
			<span class="text-lg font-extrabold text-blue-600 dark:text-blue-400">
				{#if isQuoteOnly}
					{m.buy_card_contact_for_price()}
				{:else if selectedVariant?.price != null}
					{Number(selectedVariant.price).toLocaleString()} ETB
				{:else if minPrice !== null && minPrice !== maxPrice}
					{m.buy_card_price_from({ price: minPrice.toLocaleString() })}
				{:else if minPrice !== null}
					{minPrice.toLocaleString()} ETB
				{/if}
			</span>
			{#if !isQuoteOnly && selectedVariant?.price != null}
				<span class="text-xs text-slate-400 dark:text-slate-500">{m.buy_card_each()}</span>
			{/if}
		</div>

		<!-- Step 1: colour. Swatches rather than a dropdown — it's the one choice
		     you can make by looking, and it takes a single tap. The name is
		     spelled out under them so the choice never depends on telling two
		     similar shades apart. -->
		{#if hasColorChoice}
			<div class="mt-3.5">
				<div class="mb-1.5 flex items-baseline justify-between gap-2">
					<span class="text-xs font-bold text-slate-700 dark:text-slate-200"
						>{m.buy_card_colour()}</span
					>
					<span class="truncate text-xs text-slate-500 dark:text-slate-400">
						{selectedColorName}
					</span>
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each colorOptions as c (c.id)}
						<button
							type="button"
							onclick={() => (pickedColorId = c.id)}
							aria-label={c.name}
							aria-pressed={c.id === selectedColorId}
							title={c.name}
							class="flex size-8 items-center justify-center rounded-full border transition-all {c.id ===
							selectedColorId
								? 'border-blue-600 ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-slate-900'
								: 'border-slate-300 hover:scale-110 dark:border-white/25'}"
							style={c.hex ? `background-color: ${c.hex}` : undefined}
						>
							{#if c.id === selectedColorId}
								<!-- A tick, not just a ring: colour alone can't carry the
								     "this one is selected" message. -->
								<CheckIcon class="size-4 text-white mix-blend-difference" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Step 2: size — and only when this colour genuinely comes in more than
		     one. Most colours have a single size, so for them this whole block
		     disappears and there is one less thing to decide. -->
		{#if hasSizeChoice}
			<div class="mt-3.5">
				<div class="mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
					{m.buy_card_size()}
				</div>
				<div class="flex flex-col gap-1.5">
					{#each sizeOptions as o (o.key)}
						<button
							type="button"
							onclick={() => (pickedSizeKey = o.key)}
							aria-pressed={o.key === selectedSize?.key}
							class="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-colors {o.key ===
							selectedSize?.key
								? 'border-blue-600 bg-blue-50 dark:bg-blue-500/10'
								: 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5'}"
						>
							<span class="min-w-0">
								<span
									class="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100"
								>
									{o.width ?? m.buy_card_standard()}
								</span>
								{#if o.thickness}
									<span class="block truncate text-xs text-slate-500 dark:text-slate-400">
										{o.thickness}
									</span>
								{/if}
							</span>
							{#if o.key === selectedSize?.key}
								<CheckIcon class="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{:else if selectedSize?.width}
			<!-- Single size: state it plainly instead of offering a choice of one. -->
			<div class="mt-3 text-xs text-slate-500 dark:text-slate-400">
				{selectedSize.width}{selectedSize.thickness ? ` · ${selectedSize.thickness}` : ''}
			</div>
		{/if}

		<!-- Push the button to the bottom so every card in the row lines up. -->
		<div class="mt-auto pt-3.5">
			{#if !isQuoteOnly}
				<div class="mb-2 flex items-center gap-1.5 text-xs">
					{#if inStock}
						<span class="size-1.5 rounded-full bg-emerald-500"></span>
						<span class="text-slate-500 dark:text-slate-400">{m.buy_card_in_stock()}</span>
					{:else}
						<span class="size-1.5 rounded-full bg-amber-500"></span>
						<span class="text-slate-500 dark:text-slate-400">{m.buy_card_made_to_order()}</span>
					{/if}
					{#if alreadyOnOrder > 0}
						<span class="ml-auto font-semibold text-blue-600 dark:text-blue-400">
							{m.buy_card_already_on_order({ count: alreadyOnOrder })}
						</span>
					{/if}
				</div>
			{/if}

			{#if isQuoteOnly}
				<a
					href="/shop/single/{slug}"
					class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
				>
					<MessageCircleQuestion class="size-4" />
					{m.buy_card_ask_for_price()}
				</a>
			{:else}
				<button
					type="button"
					onclick={addToOrder}
					disabled={justAdded}
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-3.5 text-sm font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-70 dark:from-blue-600 dark:to-blue-900"
				>
					{#if justAdded}
						<CheckIcon class="size-4" />
						{m.buy_card_added()}
					{:else}
						<PlusIcon class="size-4" />
						{m.buy_card_add_to_order()}
					{/if}
				</button>
				<p class="mt-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500">
					{m.buy_card_choose_length_note()}
				</p>
			{/if}
		</div>
	</div>
</div>
