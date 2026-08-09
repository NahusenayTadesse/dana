<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { PlusIcon, CheckIcon, ShoppingBag, MessageCircleQuestion } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

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
		hasQuoteOnlyVariant: boolean;
		variants: Variant[];
	};

	const { productId, productName, slug, image, categoryName, minPrice, maxPrice, hasQuoteOnlyVariant, variants }: Props =
		$props();

	const cart = useCart();
	let justAdded = $state(false);

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
		const widthPart = v.widthLabel || (v.widthValue ? `${v.widthValue}${v.widthUnit ?? ''}` : null);
		if (widthPart) parts.push(widthPart);
		const thicknessPart = v.thicknessValue ? `${v.thicknessValue}${v.thicknessUnit ?? ''}` : null;
		if (thicknessPart) parts.push(thicknessPart);
		const lengthPart = v.lengthLabel || (v.lengthValue ? `${v.lengthValue}${v.lengthUnit ?? ''}` : null);
		if (lengthPart) parts.push(v.isCustomLength ? `${lengthPart} cut to order` : lengthPart);
		return parts.length ? parts.join(' · ') : (v.sku ?? 'Standard');
	}

	// One dropdown, driven straight off the variant matrix, for the two specs
	// a shopper actually needs to pick before adding: width and thickness.
	// Color/length stay at whatever that combo's best (priced, in-stock)
	// variant carries — color can't be changed later, length still can be.
	function specKey(v: Variant) {
		return `${v.widthValue ?? ''}${v.widthUnit ?? ''}__${v.thicknessValue ?? ''}${v.thicknessUnit ?? ''}`;
	}
	function specLabel(v: Variant) {
		const parts: string[] = [];
		const widthPart = v.widthLabel || (v.widthValue ? `${v.widthValue}${v.widthUnit ?? ''}` : null);
		if (widthPart) parts.push(`${widthPart} wide`);
		const thicknessPart = v.thicknessValue ? `${v.thicknessValue}${v.thicknessUnit ?? ''}` : null;
		if (thicknessPart) parts.push(`${thicknessPart} thick`);
		return parts.length ? parts.join(' · ') : 'Standard';
	}

	const specGroups = $derived.by(() => {
		const byKey = new Map<string, Variant[]>();
		for (const v of variants) {
			const key = specKey(v);
			if (!byKey.has(key)) byKey.set(key, []);
			byKey.get(key)!.push(v);
		}
		return Array.from(byKey.entries()).map(([key, vs]) => ({
			key,
			label: specLabel(vs[0]),
			rep: vs.find((v) => v.price !== null && v.quantity > 0) ?? vs.find((v) => v.price !== null) ?? vs[0]
		}));
	});

	const hasSpecChoice = $derived(specGroups.length > 1);

	// Props are fixed for the lifetime of one card, so the default only
	// needs computing once — no need for an $effect to keep it in sync.
	let selectedSpecKey = $state<string | undefined>(defaultVariant ? specKey(defaultVariant) : undefined);

	const selectedVariant = $derived(
		specGroups.find((g) => g.key === selectedSpecKey)?.rep ?? defaultVariant
	);
	const selectedSpecLabel = $derived(
		specGroups.find((g) => g.key === selectedSpecKey)?.label ?? 'Choose an option'
	);
	const isQuoteOnly = $derived(!selectedVariant || selectedVariant.price === null);

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
			thickness: selectedVariant.thicknessValue != null ? Number(selectedVariant.thicknessValue) : null,
			thicknessUnit: selectedVariant.thicknessUnit,
			length: selectedVariant.lengthValue != null ? Number(selectedVariant.lengthValue) : null,
			lengthUnit: selectedVariant.lengthUnit,
			isCustomLength: selectedVariant.isCustomLength ?? false,
			specLabel: variantLabel(selectedVariant),
			imageUrl: selectedVariant.imageUrl
		});

		justAdded = true;
		toast.success(`${productName} added`, { description: 'Scroll down to set length and quantity.' });
		setTimeout(() => (justAdded = false), 1500);
	}
</script>

<div
	class="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900"
>
	<a href="/shop/single/{slug}" class="block h-44 shrink-0 overflow-hidden bg-slate-100 dark:bg-white/[0.03]">
		{#if image}
			<img src="/files/{image}" alt={productName} class="h-full w-full object-cover" />
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<ShoppingBag class="size-9 text-slate-300 dark:text-slate-700" />
			</div>
		{/if}
	</a>

	<div class="flex flex-1 flex-col p-4">
		{#if categoryName}
			<span class="mb-1 font-mono text-[10px] font-bold tracking-widest text-blue-600 uppercase dark:text-blue-400">
				{categoryName}
			</span>
		{/if}
		<h3 class="text-base leading-snug font-bold text-slate-900 dark:text-white">
			<a href="/shop/single/{slug}" class="no-underline hover:text-blue-600 dark:hover:text-blue-400">
				{productName}
			</a>
		</h3>

		<div class="mt-1.5 text-sm font-bold text-blue-600 dark:text-blue-400">
			{#if isQuoteOnly}
				Contact for price
			{:else if selectedVariant?.price != null}
				{Number(selectedVariant.price).toLocaleString()} ETB
			{:else if minPrice !== null && minPrice !== maxPrice}
				From {minPrice.toLocaleString()} ETB
			{:else if minPrice !== null}
				{minPrice.toLocaleString()} ETB
			{/if}
		</div>

		{#if hasSpecChoice}
			<div class="mt-3">
				<div class="mb-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase dark:text-slate-500">
					Width &amp; thickness
				</div>
				<Select
					type="single"
					value={selectedSpecKey}
					onValueChange={(val) => {
						if (val) selectedSpecKey = val;
					}}
				>
					<SelectTrigger
						class="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm font-semibold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
					>
						{selectedSpecLabel}
					</SelectTrigger>
					<SelectContent
						class="rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
					>
						{#each specGroups as g (g.key)}
							<SelectItem
								value={g.key}
								class="cursor-pointer text-sm transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:focus:bg-white/5 dark:focus:text-white"
							>
								{g.label}
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
		{/if}

		<div class="mt-3.5">
			{#if isQuoteOnly}
				<a
					href="/shop/single/{slug}"
					class="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
				>
					<MessageCircleQuestion class="size-4" />
					Ask for a price
				</a>
			{:else}
				<button
					type="button"
					onclick={addToOrder}
					disabled={justAdded}
					class="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-3 text-sm font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-70 dark:from-blue-600 dark:to-blue-900"
				>
					{#if justAdded}
						<CheckIcon class="size-4" /> Added
					{:else}
						<PlusIcon class="size-4" /> Add to my order
					{/if}
				</button>
			{/if}
		</div>
	</div>
</div>
