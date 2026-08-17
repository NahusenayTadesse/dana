<script lang="ts">
	import { TriangleAlertIcon, CombineIcon, MinusIcon, PlusIcon, Trash2Icon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { useCart } from '$lib/hooks/cart.svelte.js';
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
		widthUnit: string | null;
		widthLabel: string | null;
		thicknessValue: string | number | null;
		thicknessUnit: string | null;
		lengthValue: string | number | null;
		lengthUnit: string | null;
		lengthLabel: string | null;
		isCustomLength: boolean | null;
	};

	// One length of one variant. Product, colour, width and thickness live on
	// the group this row sits in (buy-order-group.svelte) — they are identical
	// for every row there, which is what makes the group a group. Length and
	// quantity are the only things a row owns.
	//
	// `ref` is the row's printed handle ("A2"): the group's letter and the row's
	// position in it, so an order can be talked about over the phone.
	//
	// `variants` is the full spec matrix for this line's product — empty when
	// the product behind an old cart line no longer exists in the catalog, in
	// which case length just can't be changed here.
	//
	// `isLengthCustomizable` (from products.isLengthCustomizable) switches the
	// length control from "step between the catalog's fixed length variants"
	// to "dial freely between minLength and maxLength in lengthStep increments" —
	// set by the admin per product, e.g. for cut-to-order sheet.
	//
	// `duplicateOfRef`/`duplicateOfLineId` are set by the group when an earlier
	// row in it is the identical order item — same colour, same size, same
	// length. Nothing is folded together on that account; the row simply says so
	// and offers the customer the two ways out.
	const {
		item,
		ref,
		variants = [],
		isLengthCustomizable = false,
		minLength = null,
		maxLength = null,
		lengthStep = null,
		duplicateOfRef = null,
		duplicateOfLineId = null
	}: {
		item: CartItem;
		ref: string;
		variants?: Variant[];
		isLengthCustomizable?: boolean;
		minLength?: number | null;
		maxLength?: number | null;
		lengthStep?: number | null;
		duplicateOfRef?: string | null;
		duplicateOfLineId?: string | null;
	} = $props();
	const cart = useCart();

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	// Width and thickness were locked in when this line was added (from the
	// product card's dropdown) and the group's colour applies to every row in
	// it, so a length swap must stay within that same colour/width/thickness.
	const sameSpec = (v: Variant) =>
		v.colorId === item.colorId &&
		(item.width == null ? v.widthValue == null : Number(v.widthValue) === item.width) &&
		(item.thickness == null
			? v.thicknessValue == null
			: Number(v.thicknessValue) === item.thickness);

	// The line's own human-readable summary, rebuilt from whatever spec it ends
	// up with. It travels to the server as orderItems.amount, and length changes
	// here after the line was added — a carried-over label would tell staff to
	// cut the length the customer started from rather than the one they settled
	// on.
	function specLabelFor(spec: {
		colorName: string | null;
		width: number | null;
		widthUnit: CartItem['widthUnit'];
		thickness: number | null;
		thicknessUnit: CartItem['thicknessUnit'];
		length: number | null;
		lengthUnit: CartItem['lengthUnit'];
		isCustomLength?: boolean;
		sku?: string | null;
	}) {
		const parts: string[] = [];
		if (spec.colorName) parts.push(spec.colorName);
		if (spec.width != null) parts.push(`${spec.width}${spec.widthUnit ?? ''}`);
		if (spec.thickness != null) parts.push(`${spec.thickness}${spec.thicknessUnit ?? ''}`);
		if (spec.length != null) {
			const lengthPart = `${spec.length}${spec.lengthUnit ?? ''}`;
			parts.push(spec.isCustomLength ? m.buy_cut_to_order({ length: lengthPart }) : lengthPart);
		}
		return parts.length ? parts.join(' · ') : (spec.sku ?? item.specLabel);
	}

	const lengthOptions = $derived(
		Array.from(
			new Map(
				variants
					.filter((v) => v.lengthValue !== null && !v.isCustomLength && sameSpec(v))
					.map((v) => [
						Number(v.lengthValue),
						{
							value: Number(v.lengthValue),
							label: v.lengthLabel || `${v.lengthValue}${v.lengthUnit ?? ''}`
						}
					])
			).values()
		).sort((a, b) => a.value - b.value)
	);

	// Moving to a catalog length means moving to that length's variant — same
	// colour and size, its own price and stock.
	function variantSpecFor(match: Variant) {
		return {
			colorId: match.colorId,
			colorName: match.colorName,
			width: match.widthValue != null ? Number(match.widthValue) : null,
			widthUnit: match.widthUnit as CartItem['widthUnit'],
			thickness: match.thicknessValue != null ? Number(match.thicknessValue) : null,
			thicknessUnit: match.thicknessUnit as CartItem['thicknessUnit'],
			length: match.lengthValue != null ? Number(match.lengthValue) : null,
			lengthUnit: match.lengthUnit as CartItem['lengthUnit'],
			isCustomLength: match.isCustomLength ?? false
		};
	}

	function cartItemFor(match: Variant) {
		const spec = variantSpecFor(match);
		return {
			variantId: match.variantId,
			productId: item.productId,
			productName: item.productName,
			sku: match.sku,
			price: Number(match.price),
			priceIncludesVat: item.priceIncludesVat,
			...spec,
			specLabel: specLabelFor({ ...spec, sku: match.sku }),
			imageUrl: match.imageUrl
		};
	}

	function selectLength(lengthValue: number) {
		if (lengthValue === item.length) return;
		const match = variants.find(
			(v) => sameSpec(v) && v.price !== null && Number(v.lengthValue) === lengthValue
		);
		if (!match) return;

		cart.updateVariant(item.lineId, cartItemFor(match));
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
	const catalogMaxLength = $derived(
		lengthValues.length ? lengthValues[lengthValues.length - 1] : null
	);

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
		cart.updateLength(
			item.lineId,
			next,
			isCustom,
			specLabelFor({ ...item, length: next, isCustomLength: isCustom })
		);
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
	const atCustomCeiling = $derived(
		customCeiling != null && (item.length ?? customFloor) >= customCeiling
	);

	const decreaseQuantity = () => cart.updateQuantity(item.lineId, item.quantity - 1);
	const increaseQuantity = () => cart.updateQuantity(item.lineId, item.quantity + 1);
	const removeItem = () => cart.removeItem(item.lineId);

	const usesCustomLengths = $derived(isLengthCustomizable || lengthValues.length === 0);

	// "Same thing, another length" — the length control edits this row in place,
	// so without this there is no way to ask for 3 sheets at 2m AND 2 at 3.5m.
	//
	// Lengths already on the order, so a new line can open on one that isn't.
	const takenLengths = $derived(
		cart.items
			.filter(
				(i) =>
					i.lineId !== item.lineId &&
					i.productId === item.productId &&
					i.colorId === item.colorId &&
					i.width === item.width &&
					i.thickness === item.thickness
			)
			.map((i) => i.length)
	);

	// Where a new line opens: one step up in custom mode (walking past lengths
	// already ordered, stopping at the ceiling), or the first unused catalog stop
	// otherwise. Null when there is nowhere free to open — then the new line is a
	// plain copy and the duplicate warning does its job.
	const nextFreeLength = $derived.by(() => {
		if (usesCustomLengths) {
			if (item.length == null) return null;
			let candidate = clampCustomLength(item.length + customStep);
			let guard = 0;
			while (takenLengths.includes(candidate) && guard++ < 50) {
				const stepped = clampCustomLength(candidate + customStep);
				if (stepped === candidate) return null; // at the ceiling
				candidate = stepped;
			}
			return candidate === item.length || takenLengths.includes(candidate) ? null : candidate;
		}
		return lengthValues.find((v) => v !== item.length && !takenLengths.includes(v)) ?? null;
	});

	// Add copies this line, then opens the copy at the next length nothing else
	// is using — a starting point, not a decision: it is a line of its own and
	// the customer sets it from there (1m here, 0.5m on the new one, whatever
	// they need). Starting it one step along keeps the duplicate warning for
	// what it is worth saying about — an order that really does ask for the same
	// thing twice — instead of firing on every single press.
	//
	// When nothing is free (one length in the catalog, or the dial is at its
	// ceiling) the copy stands as a copy: adding is never refused, and the row
	// then says the two are the same and offers the way out.
	function addAnotherLine() {
		const newLineId = cart.duplicateLine(item.lineId);
		const next = nextFreeLength;

		if (newLineId == null || next == null) {
			toast.info(m.buy_row_added_toast({ ref }), {
				description: m.buy_row_added_toast_hint({ ref })
			});
			return;
		}

		if (usesCustomLengths) {
			const isCustom = !lengthValues.includes(next);
			cart.updateLength(
				newLineId,
				next,
				isCustom,
				specLabelFor({ ...item, length: next, isCustomLength: isCustom })
			);
		} else {
			// Catalog mode: each length is its own variant, so the new line has to
			// be anchored to that variant — same price book, same stock, as if it
			// had been added from the product card. No variant for it (a gap in the
			// price list) leaves the copy as a copy.
			const match = variants.find(
				(v) => sameSpec(v) && v.price !== null && Number(v.lengthValue) === next
			);
			if (match) cart.updateVariant(newLineId, cartItemFor(match));
		}

		const lengthText = `${next}${item.lengthUnit ?? ''}`;
		toast.info(m.buy_row_added_toast_length({ length: lengthText }), {
			description: m.buy_row_added_toast_length_hint({ ref })
		});
	}

	// The line this one duplicates, if any: same product, colour, size, length —
	// what the group hands down after comparing the rows it holds. Only the later
	// of the pair gets the warning, so one accidental double shows one message
	// and names the line it collides with.
	const twin = $derived(
		duplicateOfLineId ? cart.items.find((i) => i.lineId === duplicateOfLineId) : undefined
	);
	const mergedQuantity = $derived((twin?.quantity ?? 0) + item.quantity);

	const mergeIntoTwin = () => {
		if (!duplicateOfLineId) return;
		cart.mergeLines(item.lineId, duplicateOfLineId);
	};

	const lineTotal = $derived(item.price * item.quantity);
</script>

<!--
	Stacked on a phone, a grid row from `sm` up. The order table used to be one
	wide `<table>` inside an overflow-x container, which on a phone hid the
	price, the total and the delete button behind a sideways scroll most people
	never find. Each cell below carries its own label until there is room for
	column headings to do that job instead.
-->
<div class={duplicateOfRef ? 'bg-amber-50/50 dark:bg-amber-500/6' : ''}>
	<div
		class="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_minmax(0,11rem)_auto] sm:items-center"
	>
		<!-- Ref, and on mobile the row's own actions sit beside it. -->
		<div class="flex items-center justify-between gap-2">
			<span
				class="inline-flex min-w-8 items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-xs font-bold {duplicateOfRef
					? 'border border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-300'
					: 'border border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400'}"
			>
				{ref}
			</span>
			<div class="flex items-center gap-1.5 sm:hidden">
				{@render actions()}
			</div>
		</div>

		<!-- Length: the one spec a row owns. Customizable products (and any row with
	     no sibling variant to step between) dial freely in lengthStep increments
	     between min/max; everything else steps between the catalog's fixed
	     length variants. -->
		<div class="flex items-center justify-between gap-3 sm:block">
			<span class="text-xs font-bold text-slate-500 sm:hidden dark:text-slate-400"
				>{m.checkout_col_length()}</span
			>

			<div class="min-w-0">
				{#if usesCustomLengths && item.length != null}
					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => stepCustomLength(-1)}
							disabled={atCustomFloor}
							aria-label={m.buy_row_shorter_length()}
							class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
						>
							<MinusIcon class="size-3.5" />
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
								aria-label={m.checkout_col_length()}
								class="w-20 [appearance:textfield] rounded-lg border border-slate-200 bg-white py-1.5 pr-7 pl-2 text-right text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
							<span
								class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-slate-400 dark:text-slate-500"
							>
								{item.lengthUnit}
							</span>
						</div>
						<button
							type="button"
							onclick={() => stepCustomLength(1)}
							disabled={atCustomCeiling}
							aria-label={m.buy_row_longer_length()}
							class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
						>
							<PlusIcon class="size-3.5" />
						</button>
					</div>
					{#if isLengthCustomizable}
						<div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
							{m.buy_row_any_length({
								min: String(customFloor),
								max: `${customCeiling ?? '∞'}${item.lengthUnit ?? ''}`
							})}
						</div>
					{/if}
				{:else if lengthValues.length >= 1}
					<div class="flex items-center gap-1">
						<button
							type="button"
							onclick={() => stepLength(-1)}
							disabled={lengthIndex <= 0}
							aria-label={m.buy_row_shorter_length()}
							class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
						>
							<MinusIcon class="size-3.5" />
						</button>
						<div class="relative">
							<input
								type="number"
								inputmode="decimal"
								value={item.length}
								min={lengthValues[0]}
								max={catalogMaxLength}
								onchange={handleLengthInput}
								aria-label={m.checkout_col_length()}
								class="w-20 [appearance:textfield] rounded-lg border border-slate-200 bg-white py-1.5 pr-7 pl-2 text-right text-sm font-bold text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
							/>
							<span
								class="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[11px] text-slate-400 dark:text-slate-500"
							>
								{item.lengthUnit}
							</span>
						</div>
						<button
							type="button"
							onclick={() => stepLength(1)}
							disabled={lengthIndex >= lengthValues.length - 1}
							aria-label={m.buy_row_longer_length()}
							class="flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
						>
							<PlusIcon class="size-3.5" />
						</button>
					</div>
					<div class="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
						{#if lengthValues.length > 1}
							{m.buy_row_longest_we_make({ length: `${catalogMaxLength}${item.lengthUnit ?? ''}` })}
						{:else}
							{m.buy_row_only_length()}
						{/if}
					</div>
				{:else}
					<!-- This product has no length axis at all (e.g. sold purely by
				     quantity) — nothing to make editable. -->
					<span class="text-sm text-slate-400 dark:text-slate-500">—</span>
				{/if}
			</div>
		</div>

		<div class="flex items-center justify-between gap-3 sm:justify-center">
			<span class="text-xs font-bold text-slate-500 sm:hidden dark:text-slate-400"
				>{m.buy_row_how_many()}</span
			>
			<div class="flex items-center gap-2">
				<button
					type="button"
					onclick={decreaseQuantity}
					aria-label={m.buy_row_fewer()}
					class="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
				>
					<MinusIcon class="size-3.5" />
				</button>
				<span class="w-7 text-center text-sm font-bold">{item.quantity}</span>
				<button
					type="button"
					onclick={increaseQuantity}
					aria-label={m.buy_row_more()}
					class="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
				>
					<PlusIcon class="size-3.5" />
				</button>
			</div>
		</div>

		<!-- The sum written out rather than split across a "unit price" and a
	     "total" column, so the arithmetic is visible instead of something the
	     reader has to redo to check it. -->
		<div
			class="flex items-baseline justify-between gap-1.5 border-t border-slate-100 pt-2 sm:block sm:border-0 sm:pt-0 sm:text-right dark:border-white/5"
		>
			<span class="text-xs text-slate-500 sm:hidden dark:text-slate-400">{m.buy_col_amount()}</span>
			<span class="text-xs whitespace-nowrap text-slate-400 sm:block dark:text-slate-500">
				{formatPrice(item.price)} × {item.quantity}
			</span>
			<span class="font-bold whitespace-nowrap text-slate-900 sm:block dark:text-white">
				{formatPrice(lineTotal)}
			</span>
		</div>

		<div class="hidden items-center justify-end gap-1.5 sm:flex">
			{@render actions()}
		</div>
	</div>

	<!-- The duplicate warning: stated on the row it is about, in words, with both
     ways out as buttons and the option of doing neither spelled out. It never
     acts on its own — two lines of the same thing can be exactly what the
     customer means (two sites, two deliveries), and only they know. -->
	{#if duplicateOfRef}
		<div class="px-4 pb-3">
			<div
				class="rounded-xl border border-amber-300 bg-amber-100/70 p-3 dark:border-amber-400/30 dark:bg-amber-500/10"
			>
				<div class="flex items-start gap-2">
					<TriangleAlertIcon
						class="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
						aria-hidden="true"
					/>
					<div class="min-w-0 flex-1">
						<p class="text-xs font-extrabold text-amber-900 dark:text-amber-200">
							{m.buy_row_duplicate_title({ ref: duplicateOfRef })}
						</p>
						<p class="mt-0.5 text-xs text-amber-800/90 dark:text-amber-200/80">
							{m.buy_row_duplicate_hint()}
						</p>
						<div class="mt-2 flex flex-wrap gap-2">
							<button
								type="button"
								onclick={mergeIntoTwin}
								class="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
							>
								<CombineIcon class="size-3.5" />
								{m.buy_row_duplicate_merge({ count: mergedQuantity })}
							</button>
							<button
								type="button"
								onclick={removeItem}
								class="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50 dark:border-amber-400/30 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-500/10"
							>
								<Trash2Icon class="size-3.5" />
								{m.buy_row_duplicate_delete({ ref: duplicateOfRef })}
							</button>
						</div>
						<p class="mt-1.5 text-[11px] text-amber-700/80 dark:text-amber-200/60">
							{m.buy_row_duplicate_keep()}
						</p>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

{#snippet actions()}
	<button
		type="button"
		onclick={addAnotherLine}
		aria-label={m.buy_row_add_length_aria()}
		title={m.buy_row_add_length_title({ ref })}
		class="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-bold whitespace-nowrap text-blue-700 hover:bg-blue-100 dark:border-blue-400/30 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
	>
		<PlusIcon class="size-3.5" />
		{m.buy_row_add_word()}
	</button>
	<button
		type="button"
		onclick={removeItem}
		aria-label={m.buy_row_remove_line()}
		class="flex size-9 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
	>
		<Trash2Icon class="size-4" />
	</button>
{/snippet}
