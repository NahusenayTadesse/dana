<script lang="ts">
	import { MinusIcon, PlusIcon, Trash2Icon } from '@lucide/svelte';
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { useCart } from '$lib/hooks/cart.svelte.js';
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
		widthUnit: string | null;
		widthLabel: string | null;
		thicknessValue: string | number | null;
		thicknessUnit: string | null;
		lengthValue: string | number | null;
		lengthUnit: string | null;
		lengthLabel: string | null;
		isCustomLength: boolean | null;
	};

	// `variants` is the full spec matrix for this line's product — undefined
	// when the product behind an old cart line no longer exists in the
	// catalog, in which case length just can't be changed here.
	//
	// `isLengthCustomizable` (from products.isLengthCustomizable) switches the
	// length control from "step between the catalog's fixed length variants"
	// to "dial freely between minLength and maxLength in lengthStep increments" —
	// set by the admin per product, e.g. for cut-to-order sheet.
	const {
		item,
		variants = [],
		isLengthCustomizable = false,
		minLength = null,
		maxLength = null,
		lengthStep = null
	}: {
		item: CartItem;
		variants?: Variant[];
		isLengthCustomizable?: boolean;
		minLength?: number | null;
		maxLength?: number | null;
		lengthStep?: number | null;
	} = $props();
	const cart = useCart();

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	// Width and thickness were locked in when this line was added (from the
	// product card's dropdown) — this table adjusts color, length and
	// quantity, so those swaps must stay within that same width/thickness.
	const matchesWidthThickness = (v: Variant) =>
		(item.width == null ? v.widthValue == null : Number(v.widthValue) === item.width) &&
		(item.thickness == null ? v.thicknessValue == null : Number(v.thicknessValue) === item.thickness);

	const sameSpec = (v: Variant) => v.colorId === item.colorId && matchesWidthThickness(v);

	// Every color this product offers at the same width/thickness — one
	// representative variant per color, so switching color can find the best
	// (priced, in-stock, closest-length) match to move this line to.
	const colorOptions = $derived(
		Array.from(
			new Map(
				variants
					.filter((v) => v.colorId != null && matchesWidthThickness(v))
					.map((v) => [v.colorId, { id: v.colorId as number, name: v.colorName, hex: v.colorHex }])
			).values()
		)
	);

	function selectColor(colorId: number) {
		if (colorId === item.colorId) return;
		const candidates = variants.filter((v) => v.colorId === colorId && matchesWidthThickness(v));
		const match =
			candidates.find((v) => v.price !== null && Number(v.lengthValue) === item.length) ??
			candidates.find((v) => v.price !== null && v.quantity > 0) ??
			candidates.find((v) => v.price !== null);
		if (!match) return;

		cart.updateVariant(item.variantId, {
			variantId: match.variantId,
			productId: item.productId,
			productName: item.productName,
			sku: match.sku,
			price: Number(match.price),
			priceIncludesVat: item.priceIncludesVat,
			colorId: match.colorId,
			colorName: match.colorName,
			width: match.widthValue != null ? Number(match.widthValue) : null,
			widthUnit: match.widthUnit as CartItem['widthUnit'],
			thickness: match.thicknessValue != null ? Number(match.thicknessValue) : null,
			thicknessUnit: match.thicknessUnit as CartItem['thicknessUnit'],
			length: match.lengthValue != null ? Number(match.lengthValue) : null,
			lengthUnit: match.lengthUnit as CartItem['lengthUnit'],
			isCustomLength: match.isCustomLength ?? false,
			specLabel: item.specLabel,
			imageUrl: match.imageUrl
		});
	}

	const lengthOptions = $derived(
		Array.from(
			new Map(
				variants
					.filter((v) => v.lengthValue !== null && !v.isCustomLength && sameSpec(v))
					.map((v) => [
						Number(v.lengthValue),
						{ value: Number(v.lengthValue), label: v.lengthLabel || `${v.lengthValue}${v.lengthUnit ?? ''}` }
					])
			).values()
		).sort((a, b) => a.value - b.value)
	);

	const widthText = $derived(item.width != null ? `${item.width}${item.widthUnit ?? ''}` : '—');
	const thicknessText = $derived(
		item.thickness != null
			? `${item.thickness}${item.thicknessUnit === 'gauge' ? ' ga' : (item.thicknessUnit ?? '')}`
			: '—'
	);

	function selectLength(lengthValue: number) {
		if (lengthValue === item.length) return;
		const match = variants.find((v) => sameSpec(v) && v.price !== null && Number(v.lengthValue) === lengthValue);
		if (!match) return;

		cart.updateVariant(item.variantId, {
			variantId: match.variantId,
			productId: item.productId,
			productName: item.productName,
			sku: match.sku,
			price: Number(match.price),
			priceIncludesVat: item.priceIncludesVat,
			colorId: match.colorId,
			colorName: match.colorName,
			width: match.widthValue != null ? Number(match.widthValue) : null,
			widthUnit: match.widthUnit as CartItem['widthUnit'],
			thickness: match.thicknessValue != null ? Number(match.thicknessValue) : null,
			thicknessUnit: match.thicknessUnit as CartItem['thicknessUnit'],
			length: match.lengthValue != null ? Number(match.lengthValue) : null,
			lengthUnit: match.lengthUnit as CartItem['lengthUnit'],
			isCustomLength: match.isCustomLength ?? false,
			specLabel: item.specLabel,
			imageUrl: match.imageUrl
		});
	}

	// Catalog mode: free to type or step through, but always snaps to the
	// nearest length this product actually has priced — so it's freely
	// adjustable while staying capped at the longest one on offer.
	const lengthValues = $derived(lengthOptions.map((l) => l.value));
	const lengthIndex = $derived.by(() => {
		if (lengthValues.length === 0) return -1;
		const raw = item.length ?? lengthValues[0];
		let best = 0;
		let bestDiff = Infinity;
		lengthValues.forEach((v, i) => {
			const diff = Math.abs(v - raw);
			if (diff < bestDiff) {
				bestDiff = diff;
				best = i;
			}
		});
		return best;
	});
	const catalogMaxLength = $derived(lengthValues.length ? lengthValues[lengthValues.length - 1] : null);

	function nearestLengthValue(raw: number) {
		let best = lengthValues[0];
		let bestDiff = Infinity;
		lengthValues.forEach((v) => {
			const diff = Math.abs(v - raw);
			if (diff < bestDiff) {
				bestDiff = diff;
				best = v;
			}
		});
		return best;
	}

	function stepLength(delta: number) {
		if (lengthIndex < 0) return;
		const newIndex = Math.min(lengthValues.length - 1, Math.max(0, lengthIndex + delta));
		selectLength(lengthValues[newIndex]);
	}

	function handleLengthInput(e: Event) {
		const raw = Number((e.currentTarget as HTMLInputElement).value);
		if (Number.isNaN(raw) || lengthValues.length === 0) return;
		selectLength(nearestLengthValue(raw));
	}

	// Custom mode (product.isLengthCustomizable): no snapping to catalog stops
	// at all — length dials freely between customFloor and customCeiling, and
	// each +/- press moves by customStep. Same variant/price throughout, only
	// the requested length (and its "custom" flag) changes.
	const customFloor = $derived(minLength ?? lengthValues[0] ?? 0.1);
	const customCeiling = $derived(maxLength ?? catalogMaxLength ?? null);
	const customStep = $derived(lengthStep ?? 1);

	function clampCustomLength(raw: number) {
		let out = Math.max(customFloor, raw);
		if (customCeiling != null) out = Math.min(customCeiling, out);
		return Math.round(out * 100) / 100;
	}

	function applyCustomLength(next: number) {
		const isCustom = !lengthValues.includes(next);
		cart.updateLength(item.variantId, next, isCustom);
	}

	function stepCustomLength(delta: number) {
		const base = item.length ?? customFloor;
		applyCustomLength(clampCustomLength(base + delta * customStep));
	}

	function handleCustomLengthInput(e: Event) {
		const raw = Number((e.currentTarget as HTMLInputElement).value);
		if (Number.isNaN(raw)) return;
		applyCustomLength(clampCustomLength(raw));
	}

	const atCustomFloor = $derived((item.length ?? customFloor) <= customFloor);
	const atCustomCeiling = $derived(customCeiling != null && (item.length ?? customFloor) >= customCeiling);

	const decreaseQuantity = () => cart.updateQuantity(item.variantId, item.quantity - 1);
	const increaseQuantity = () => cart.updateQuantity(item.variantId, item.quantity + 1);
	const removeItem = () => cart.removeItem(item.variantId);

	const lineTotal = $derived(item.price * item.quantity);
</script>

<tr class="border-b border-slate-200/70 align-middle last:border-b-0 dark:border-white/10">
	<td class="py-3 pr-3 pl-4">
		<div class="flex items-center gap-3">
			{#if item.imageUrl}
				<img
					src="/files/{item.imageUrl}"
					alt={item.productName}
					class="size-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-white/10"
				/>
			{:else}
				<div
					class="flex size-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-slate-300 text-[9px] text-slate-400 dark:border-white/15"
				>
					No image
				</div>
			{/if}
			<div class="min-w-0">
				<div class="truncate font-bold text-slate-900 dark:text-white">{item.productName}</div>
			</div>
		</div>
	</td>

	<!-- Color: a dropdown whenever this product has a color axis at all, same
	     as length and quantity, so it can be adjusted right here alongside
	     them — not just when there happens to be more than one option. -->
	<td class="py-3 pr-3">
		{#if colorOptions.length >= 1}
			<Select
				type="single"
				value={item.colorId != null ? String(item.colorId) : undefined}
				onValueChange={(val) => {
					if (val) selectColor(Number(val));
				}}
			>
				<SelectTrigger
					class="w-32 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
				>
					<span class="flex items-center gap-1.5 truncate">
						{#if colorOptions.find((c) => c.id === item.colorId)?.hex}
							<span
								class="size-2.5 shrink-0 rounded-full border border-slate-300 dark:border-white/20"
								style="background-color: {colorOptions.find((c) => c.id === item.colorId)?.hex}"
							></span>
						{/if}
						{item.colorName ?? 'Select color'}
					</span>
				</SelectTrigger>
				<SelectContent
					class="rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
				>
					{#each colorOptions as c (c.id)}
						<SelectItem
							value={String(c.id)}
							class="cursor-pointer text-sm transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:focus:bg-white/5 dark:focus:text-white"
						>
							<span class="flex items-center gap-1.5">
								{#if c.hex}
									<span
										class="size-2.5 shrink-0 rounded-full border border-slate-300 dark:border-white/20"
										style="background-color: {c.hex}"
									></span>
								{/if}
								{c.name}
							</span>
						</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		{:else}
			<span class="text-sm whitespace-nowrap text-slate-600 dark:text-slate-300">{item.colorName ?? '—'}</span>
		{/if}
	</td>

	<td class="py-3 pr-3 text-sm whitespace-nowrap text-slate-600 dark:text-slate-300">{widthText}</td>

	<td class="py-3 pr-3 text-sm whitespace-nowrap text-slate-600 dark:text-slate-300">{thicknessText}</td>

	<!-- Length: the one adjustable spec in this table. Customizable products
	     (and any line with no sibling variant to step between) dial freely in
	     lengthStep increments between min/max; everything else steps between
	     the catalog's fixed length variants. -->
	<td class="py-3 pr-3">
		{#if isLengthCustomizable || (lengthValues.length === 0 && item.length != null)}
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => stepCustomLength(-1)}
					disabled={atCustomFloor}
					aria-label="Shorter length"
					class="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
				>
					<MinusIcon class="size-3" />
				</button>
				<div class="relative">
					<input
						type="number"
						inputmode="decimal"
						value={item.length}
						min={customFloor}
						max={customCeiling ?? undefined}
						step={customStep}
						onchange={handleCustomLengthInput}
						class="w-16 rounded-lg border border-slate-200 bg-white py-1 pr-6 pl-2 text-right text-xs font-bold text-slate-900 [appearance:textfield] focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					/>
					<span
						class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[10px] text-slate-400 dark:text-slate-500"
					>
						{item.lengthUnit}
					</span>
				</div>
				<button
					type="button"
					onclick={() => stepCustomLength(1)}
					disabled={atCustomCeiling}
					aria-label="Longer length (up to max)"
					class="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
				>
					<PlusIcon class="size-3" />
				</button>
			</div>
			{#if isLengthCustomizable}
				<div class="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
					{customFloor}–{customCeiling ?? '∞'}{item.lengthUnit}, steps of {customStep}
				</div>
			{/if}
		{:else if lengthValues.length >= 1}
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => stepLength(-1)}
					disabled={lengthIndex <= 0}
					aria-label="Shorter length"
					class="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
				>
					<MinusIcon class="size-3" />
				</button>
				<div class="relative">
					<input
						type="number"
						inputmode="decimal"
						value={item.length}
						min={lengthValues[0]}
						max={catalogMaxLength}
						onchange={handleLengthInput}
						class="w-16 rounded-lg border border-slate-200 bg-white py-1 pr-6 pl-2 text-right text-xs font-bold text-slate-900 [appearance:textfield] focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
					/>
					<span
						class="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-[10px] text-slate-400 dark:text-slate-500"
					>
						{item.lengthUnit}
					</span>
				</div>
				<button
					type="button"
					onclick={() => stepLength(1)}
					disabled={lengthIndex >= lengthValues.length - 1}
					aria-label="Longer length (up to max)"
					class="flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
				>
					<PlusIcon class="size-3" />
				</button>
			</div>
			<div class="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
				{#if lengthValues.length > 1}
					max {catalogMaxLength}{item.lengthUnit}
				{:else}
					only length available at this spec
				{/if}
			</div>
		{:else}
			<!-- This product has no length axis at all (e.g. sold purely by
			     quantity) — nothing to make editable. -->
			<span class="text-sm text-slate-400 dark:text-slate-500">—</span>
		{/if}
	</td>

	<td class="py-3 pr-3">
		<div class="flex items-center justify-center gap-2">
			<button
				type="button"
				onclick={decreaseQuantity}
				aria-label="Decrease quantity"
				class="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
			>
				<MinusIcon class="size-3.5" />
			</button>
			<span class="w-6 text-center text-sm font-bold">{item.quantity}</span>
			<button
				type="button"
				onclick={increaseQuantity}
				aria-label="Increase quantity"
				class="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
			>
				<PlusIcon class="size-3.5" />
			</button>
		</div>
	</td>

	<td class="py-3 pr-3 text-right text-sm whitespace-nowrap text-slate-600 dark:text-slate-300">
		{formatPrice(item.price)}
	</td>

	<td class="py-3 pr-3 text-right font-extrabold whitespace-nowrap text-slate-900 dark:text-white">
		{formatPrice(lineTotal)}
	</td>

	<td class="py-3 pr-4 text-right">
		<button
			type="button"
			onclick={removeItem}
			aria-label="Remove item"
			class="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
		>
			<Trash2Icon class="size-4" />
		</button>
	</td>
</tr>
