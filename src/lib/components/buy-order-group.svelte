<script lang="ts">
	import type { CartItem } from '$lib/hooks/cart.svelte.js';
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { CheckIcon } from '@lucide/svelte';
	import BuyOrderRow from './buy-order-row.svelte';
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

	// One block: every cart line that is the same product in the same colour,
	// width and thickness, differing only in length and quantity. That is the
	// shape an order actually takes here — "the 0.45mm red sheet, 3 at 2m and 2
	// at 3.5m" — so it reads as one block with a letter on it rather than as
	// unrelated rows scattered down a flat table.
	//
	// `letter` is the block's handle (A, B, C…); rows inside are numbered from
	// 1, giving each line a short ref like "B2".
	const {
		letter,
		items,
		variants = [],
		isLengthCustomizable = false,
		minLength = null,
		maxLength = null,
		lengthStep = null
	}: {
		letter: string;
		items: CartItem[];
		variants?: Variant[];
		isLengthCustomizable?: boolean;
		minLength?: number | null;
		maxLength?: number | null;
		lengthStep?: number | null;
	} = $props();

	const cart = useCart();

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	// Every row in the block shares these, so the header speaks for all of them.
	const head = $derived(items[0]);

	const matchesWidthThickness = (v: Variant) =>
		(head.width == null ? v.widthValue == null : Number(v.widthValue) === head.width) &&
		(head.thickness == null
			? v.thicknessValue == null
			: Number(v.thicknessValue) === head.thickness);

	// Prefer the catalog's own wording for a size ("3 Feet (914mm)") over the
	// raw millimetres — same friendly labels the product cards show.
	const sizeText = $derived.by(() => {
		const match = variants.find(matchesWidthThickness);
		const width =
			match?.widthLabel ?? (head.width != null ? `${head.width}${head.widthUnit ?? ''}` : null);
		const thickness =
			head.thickness != null
				? `${head.thickness}${head.thicknessUnit === 'gauge' ? ` ${m.buy_unit_gauge()}` : (head.thicknessUnit ?? '')}`
				: null;
		return [width, thickness].filter(Boolean).join(' · ');
	});

	const groupQuantity = $derived(items.reduce((sum, i) => sum + i.quantity, 0));
	// Number(): CartItem.price is nullable for quote-only variants, which
	// addItem refuses to take, so a line here always has one.
	const groupTotal = $derived(items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0));

	// Every colour this product offers at the same width/thickness — one
	// representative variant per colour.
	const colorOptions = $derived.by(() => {
		const out: { id: number; name: string | null; hex: string | null }[] = [];
		for (const v of variants) {
			if (v.colorId == null || !matchesWidthThickness(v)) continue;
			if (out.some((c) => c.id === v.colorId)) continue;
			out.push({ id: v.colorId, name: v.colorName, hex: v.colorHex });
		}
		return out;
	});

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
		return parts.join(' · ') || (spec.sku ?? '');
	}

	// Colour belongs to the block, not to a row: the whole point of the block is
	// that every row in it is the same thing at a different length, so
	// recolouring one row would split the block in two. Each row keeps its own
	// length across the swap.
	function selectColor(colorId: number) {
		if (colorId === head.colorId) return;

		const candidates = variants.filter((v) => v.colorId === colorId && matchesWidthThickness(v));
		if (candidates.length === 0) return;

		// Snapshot the line ids first: recolouring can merge a row into an
		// existing one (if that colour is already on the order at this length),
		// which reshuffles cart.items underneath the loop.
		for (const lineId of items.map((i) => i.lineId)) {
			const line = cart.items.find((i) => i.lineId === lineId);
			if (!line) continue;

			const match =
				candidates.find((v) => v.price !== null && Number(v.lengthValue) === line.length) ??
				candidates.find((v) => v.price !== null && v.quantity > 0) ??
				candidates.find((v) => v.price !== null);
			if (!match) continue;

			// An off-catalog length was dialled in by hand; no variant carries it,
			// so it survives the swap rather than snapping to the matched
			// variant's catalog length.
			const keepsCustomLength = line.isCustomLength === true && line.length != null;

			const spec = {
				colorId: match.colorId,
				colorName: match.colorName,
				width: match.widthValue != null ? Number(match.widthValue) : null,
				widthUnit: match.widthUnit as CartItem['widthUnit'],
				thickness: match.thicknessValue != null ? Number(match.thicknessValue) : null,
				thicknessUnit: match.thicknessUnit as CartItem['thicknessUnit'],
				length: keepsCustomLength
					? line.length
					: match.lengthValue != null
						? Number(match.lengthValue)
						: null,
				lengthUnit: (match.lengthUnit as CartItem['lengthUnit']) ?? line.lengthUnit,
				isCustomLength: keepsCustomLength ? true : (match.isCustomLength ?? false)
			};

			cart.updateVariant(lineId, {
				variantId: match.variantId,
				productId: line.productId,
				productName: line.productName,
				sku: match.sku,
				price: Number(match.price),
				priceIncludesVat: line.priceIncludesVat,
				...spec,
				specLabel: specLabelFor({ ...spec, sku: match.sku }) || line.specLabel,
				imageUrl: match.imageUrl
			});
		}
	}

	const removeGroup = () => {
		for (const lineId of items.map((i) => i.lineId)) cart.removeItem(lineId);
	};
</script>

<section
	class="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
>
	<!-- Block header: the spec every row below shares, stated once. -->
	<header
		class="border-b border-slate-200 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/[0.03]"
	>
		<div class="flex items-start gap-3">
			<span
				class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white"
				aria-label={m.buy_group_block_aria({ letter })}
			>
				{letter}
			</span>

			{#if head.imageUrl}
				<img
					src="/files/{head.imageUrl}"
					alt={head.productName}
					class="size-11 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-white/10"
				/>
			{/if}

			<div class="min-w-0 flex-1">
				<div class="font-extrabold text-slate-900 dark:text-white">
					{head.productName}
				</div>
				<div class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
					{#if sizeText}{sizeText} ·
					{/if}{m.buy_group_lengths({ count: items.length })} · {m.buy_pieces({
						count: groupQuantity
					})}
				</div>
			</div>

			<button
				type="button"
				onclick={removeGroup}
				class="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
			>
				{m.buy_group_remove_all()}
			</button>
		</div>

		<!-- Colour is picked the same way here as on the product cards: tap a
		     swatch. One less control style to learn, and it works the same on a
		     phone as on a desktop. -->
		{#if colorOptions.length >= 1}
			<div class="mt-3">
				<div class="mb-1.5 flex items-baseline gap-2">
					<span class="text-xs font-bold text-slate-700 dark:text-slate-200"
						>{m.buy_card_colour()}</span
					>
					<span class="truncate text-xs text-slate-500 dark:text-slate-400">
						{head.colorName ?? '—'}
					</span>
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each colorOptions as c (c.id)}
						<button
							type="button"
							onclick={() => selectColor(c.id)}
							aria-label={c.name ?? m.buy_card_colour()}
							aria-pressed={c.id === head.colorId}
							title={c.name ?? m.buy_card_colour()}
							class="flex size-8 items-center justify-center rounded-full border transition-all {c.id ===
							head.colorId
								? 'border-blue-600 ring-2 ring-blue-600 ring-offset-1 dark:ring-offset-slate-900'
								: 'border-slate-300 hover:scale-110 dark:border-white/25'}"
							style={c.hex ? `background-color: ${c.hex}` : undefined}
						>
							{#if c.id === head.colorId}
								<CheckIcon class="size-4 text-white mix-blend-difference" />
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{:else if head.colorName}
			<div class="mt-2 text-xs text-slate-500 dark:text-slate-400">{head.colorName}</div>
		{/if}
	</header>

	<!-- Column headings only exist from `sm` up, where the rows line up as a
	     grid. Below that each row stacks and carries its own labels, so there is
	     never anything to scroll sideways to reach. -->
	<div
		class="hidden gap-3 border-b border-slate-200 px-4 py-2 text-xs font-bold text-slate-400 uppercase sm:grid sm:grid-cols-[2.5rem_minmax(0,1fr)_auto_minmax(0,11rem)_auto] dark:border-white/10 dark:text-slate-500"
	>
		<span>{m.buy_col_ref()}</span>
		<span>{m.checkout_col_length()}</span>
		<span class="text-center">{m.cart_col_qty()}</span>
		<span class="text-right">{m.buy_col_amount()}</span>
		<span class="w-20"></span>
	</div>

	<div class="divide-y divide-slate-200/70 dark:divide-white/10">
		{#each items as item, i (item.lineId)}
			<BuyOrderRow
				{item}
				ref="{letter}{i + 1}"
				{variants}
				{isLengthCustomizable}
				{minLength}
				{maxLength}
				{lengthStep}
			/>
		{/each}
	</div>

	<div
		class="flex items-center justify-between border-t border-slate-200 bg-slate-50/70 px-4 py-2.5 dark:border-white/10 dark:bg-white/[0.03]"
	>
		<span class="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">
			{m.buy_group_block_total({ letter })}
		</span>
		<span class="font-mono font-extrabold text-slate-900 dark:text-white">
			{formatPrice(groupTotal)}
		</span>
	</div>
</section>
