<script lang="ts">
	import {
		CheckIcon,
		ShoppingCart,
		PlusIcon,
		MinusIcon,
		FileText,
		Printer,

		Share,

		Share2


	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import ProductCard from './product-card.svelte';
	import * as m from '$lib/paraglide/messages.js';

	type ProductInfo = {
		id: number;
		name: string;
		slug: string;
		brand: string | null;
		categoryName?: string | null;
		featuredImage: string | null;
		description: string | null;
		overview: string | null;
		quantity: number; // base retail qty — only meaningful for products with no variants
		thickness: string | null; // summary range text, e.g. "0.3mm – 0.6mm"
		width: string | null;
		soldBy: 'quantity' | 'length' | 'both';
		maxLength: string | number | null; // cap on a custom cut-to-order length request
		maxLengthUnit: string | null;
		coatingType: string | null;
		colorOptions: string | null; // now a marketing blurb, not parsed for swatches
		sizeRange: string | null;
		finish: string | null;
		performanceFeatures: string | null;
		advantages: string | null;
		applications: string | null;
	};

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
		lengthValue?: string | number | null;
		lengthUnit?: 'mm' | 'm' | 'ft' | null;
		lengthLabel?: string | null;
		isCustomLength?: boolean | null;
	};

	type RelatedProduct = {
		id: number;
		slug: string;
		name: string;
		featuredImage: string | null;
		thickness?: string | null;
	};

	// Shape produced by assembleProductCard() server-side — a full
	// product-card.svelte-ready record, variant picker and all.
	type Accessory = {
		id: number;
		productId: number;
		productName: string;
		slug: string;
		image: string | null;
		categoryName?: string | null;
		brand: string | null;
		coatingType: string | null;
		thickness: string | null;
		width: string | null;
		soldBy: 'quantity' | 'length' | 'both';
		minPrice: number | null;
		maxPrice: number | null;
		hasQuoteOnlyVariant: boolean;
		totalQuantity: number;
		variants: Variant[];
	};

	type Props = {
		product: ProductInfo;
		images?: string[]; // extra gallery shots from product_images
		variants?: Variant[];
		relatedProducts?: RelatedProduct[];
		accessories?: Accessory[];
	};

	const {
		product,
		images = [],
		variants = [],
		relatedProducts = [],
		accessories = []
	}: Props = $props();

	const cart = useCart();

	// Sliders (shadcn, then native <input type="range">) turned out too fiddly
	// for picking an exact mill spec — a number field with +/- steppers is
	// slower to look at but nobody mis-taps their way into the wrong thickness.
	const stepperBtnClass =
		'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white';
	const numberInputClass =
		'w-full rounded-lg border border-slate-200 bg-white py-1.5 pr-10 pl-3 text-right font-mono text-sm font-bold text-slate-900 [appearance:textfield] focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-slate-900 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

	/** Index of the option in `options` closest to `raw` — used so a typed
	 * number always resolves to a real catalog spec, never an in-between value. */
	function nearestIndex(raw: number, options: number[]): number {
		if (options.length === 0 || Number.isNaN(raw)) return 0;
		let best = 0;
		let bestDiff = Infinity;
		options.forEach((opt, i) => {
			const diff = Math.abs(opt - raw);
			if (diff < bestDiff) {
				bestDiff = diff;
				best = i;
			}
		});
		return best;
	}

	function variantLabel(v: Variant, opts: { skipColor?: boolean } = {}) {
		const parts: string[] = [];
		if (!opts.skipColor && v.colorName) parts.push(v.colorName);

		const widthPart = v.widthLabel || (v.widthValue ? `${v.widthValue}${v.widthUnit ?? ''}` : null);
		if (widthPart) parts.push(widthPart);

		const thicknessPart = v.thicknessValue ? `${v.thicknessValue}${v.thicknessUnit ?? ''}` : null;
		if (thicknessPart) parts.push(thicknessPart);

		const lengthPart =
			v.lengthLabel || (v.lengthValue ? `${v.lengthValue}${v.lengthUnit ?? ''}` : null);
		if (lengthPart)
			parts.push(
				v.isCustomLength ? `${lengthPart} ${m.product_detail_cut_to_order()}` : lengthPart
			);

		return parts.length ? parts.join(' · ') : (v.sku ?? m.product_detail_default_variant_label());
	}

	// Gallery: featured image + explicit gallery images + every variant's own image, deduped
	const allGalleryImages = $derived.by(() => {
		const combined: string[] = [];
		if (product?.featuredImage) combined.push(product.featuredImage);
		combined.push(...images);
		variants.forEach((v) => v.imageUrl && combined.push(v.imageUrl));
		return Array.from(new Set(combined.filter(Boolean)));
	});

	const hasVariants = $derived(variants.length > 0);

	// Does this product vary by color at all? Some products (e.g. plain accessories)
	// might only vary by width/thickness, or not vary at all.
	const hasColorAxis = $derived(variants.some((v) => v.colorId !== null));
	const availableColors = $derived(
		Array.from(
			new Map(
				variants
					.filter((v) => v.colorId !== null)
					.map((v) => [v.colorId, { id: v.colorId, name: v.colorName, hex: v.colorHex }])
			).values()
		)
	);

	const defaultVariant = $derived(
		variants.find((v) => v.price !== null && v.quantity > 0) ??
			variants.find((v) => v.price !== null) ??
			variants[0]
	);

	let selectedColorId = $state<number | null>(defaultVariant?.colorId ?? null);

	// Every variant matching the currently selected color (or all, if this product has no color axis)
	const variantsForSelectedColor = $derived(
		hasColorAxis ? variants.filter((v) => v.colorId === selectedColorId) : variants
	);

	// --- Configurator: thickness/width/length sliders instead of a flat dropdown ---
	// Thickness and width are fixed by mill tooling, so their sliders step through
	// the real distinct values this product actually comes in. Length is often
	// cut to order, so — when the product supports it — it gets a free numeric
	// entry up to maxLength instead of being limited to catalog stops.
	function distinctSorted(values: (number | null)[]): number[] {
		return Array.from(new Set(values.filter((v): v is number => v !== null))).sort((a, b) => a - b);
	}

	const thicknessOptions = $derived(
		distinctSorted(variantsForSelectedColor.map((v) => (v.thicknessValue != null ? Number(v.thicknessValue) : null)))
	);
	const widthOptions = $derived(
		distinctSorted(variantsForSelectedColor.map((v) => (v.widthValue != null ? Number(v.widthValue) : null)))
	);
	const catalogLengthOptions = $derived(
		distinctSorted(
			variantsForSelectedColor
				.filter((v) => !v.isCustomLength)
				.map((v) => (v.lengthValue != null ? Number(v.lengthValue) : null))
		)
	);

	const thicknessUnit = $derived(variantsForSelectedColor.find((v) => v.thicknessValue != null)?.thicknessUnit ?? 'mm');
	const widthUnit = $derived(variantsForSelectedColor.find((v) => v.widthValue != null)?.widthUnit ?? 'mm');
	const catalogLengthUnit = $derived(variantsForSelectedColor.find((v) => v.lengthValue != null)?.lengthUnit ?? 'm');

	// Seed the sliders from the actual default variant (not just "smallest
	// available"), computed once up front from the raw variants list so it
	// doesn't depend on reactive state that isn't initialized yet.
	const initialColorVariants = defaultVariant
		? hasColorAxis
			? variants.filter((v) => v.colorId === defaultVariant.colorId)
			: variants
		: [];
	const initialThicknessOptions = distinctSorted(
		initialColorVariants.map((v) => (v.thicknessValue != null ? Number(v.thicknessValue) : null))
	);
	const initialWidthOptions = distinctSorted(
		initialColorVariants.map((v) => (v.widthValue != null ? Number(v.widthValue) : null))
	);
	const initialLengthOptions = distinctSorted(
		initialColorVariants
			.filter((v) => !v.isCustomLength)
			.map((v) => (v.lengthValue != null ? Number(v.lengthValue) : null))
	);

	let thicknessIndex = $state(
		Math.max(0, initialThicknessOptions.indexOf(Number(defaultVariant?.thicknessValue ?? NaN)))
	);
	let widthIndex = $state(Math.max(0, initialWidthOptions.indexOf(Number(defaultVariant?.widthValue ?? NaN))));
	let lengthIndex = $state(
		Math.max(0, initialLengthOptions.indexOf(Number(defaultVariant?.lengthValue ?? NaN)))
	); // index into catalogLengthOptions, when not using custom length

	const allowsCustomLength = $derived(
		(product.soldBy === 'length' || product.soldBy === 'both') && product.maxLength != null
	);
	const maxLengthValue = $derived(product.maxLength != null ? Number(product.maxLength) : 0);
	const maxLengthUnit = $derived(product.maxLengthUnit ?? 'm');

	// Starting point for the custom-length input: the smallest catalog length if
	// one exists, otherwise a sensible fraction of the max.
	let customLength = $state<number>(1);
	let customLengthTouched = $state(false);
	$effect(() => {
		if (!customLengthTouched && catalogLengthOptions.length > 0) {
			customLength = catalogLengthOptions[0];
		}
	});

	const selectedThickness = $derived(thicknessOptions[thicknessIndex] ?? null);
	const selectedWidth = $derived(widthOptions[widthIndex] ?? null);
	const selectedCatalogLength = $derived(catalogLengthOptions[lengthIndex] ?? null);

	// Does the currently configured length match a real catalog length? If the
	// product allows custom length and the customer dialed in something else,
	// there's no exact-priced variant — that becomes a custom quote request.
	const useCustomLength = $derived(allowsCustomLength && customLengthTouched);
	const effectiveLength = $derived(useCustomLength ? customLength : selectedCatalogLength);
	const isCustomLength = $derived(
		useCustomLength && !catalogLengthOptions.some((l) => l === customLength)
	);

	const configuredVariant = $derived(
		variantsForSelectedColor.find(
			(v) =>
				(thicknessOptions.length === 0 || (v.thicknessValue != null && Number(v.thicknessValue) === selectedThickness)) &&
				(widthOptions.length === 0 || (v.widthValue != null && Number(v.widthValue) === selectedWidth)) &&
				(catalogLengthOptions.length === 0 ||
					isCustomLength ||
					(v.lengthValue != null && Number(v.lengthValue) === effectiveLength) ||
					(v.lengthValue == null && effectiveLength == null))
		) ?? null
	);

	// No silent fallback to defaultVariant here — if the configured combo
	// doesn't exist as a real variant, the price/spec panel must show that
	// (via isQuoteOnly below), not a mismatched price for a spec the customer
	// didn't actually select.
	const selectedVariant = $derived(isCustomLength ? null : configuredVariant);

	const displayImage = $derived(
		selectedVariant?.imageUrl || product?.featuredImage || allGalleryImages[0] || ''
	);

	let quantity = $state(1);
	let justAdded = $state(false);

	// A custom (off-catalog) length has no priced variant to match — that's a
	// quote request too, same as a variant that's explicitly quote-only.
	const isQuoteOnly = $derived(isCustomLength || !selectedVariant || selectedVariant.price === null);
	const inStock = $derived(
		selectedVariant ? selectedVariant.quantity > 0 : !hasVariants && product.quantity > 0
	);
	const numericPrice = $derived(
		selectedVariant?.price != null ? Number(selectedVariant.price) : null
	);

	const quantityInCart = $derived(
		selectedVariant
			? (cart.items.find((i) => i.variantId === selectedVariant.variantId)?.quantity ?? 0)
			: 0
	);

	// Product-level summary spec table — these are the descriptive "range" fields
	// (e.g. "0.3mm – 0.6mm"), separate from the exact per-variant specs below.
	const specRows = $derived(
		[
			{ k: m.product_detail_spec_thickness_range(), v: product?.thickness },
			{ k: m.product_detail_spec_standard_width(), v: product?.width },
			{ k: m.product_detail_spec_coating_classification(), v: product?.coatingType },
			{ k: m.product_detail_spec_available_finish(), v: product?.finish },
			{ k: m.product_detail_spec_size_profiles(), v: product?.sizeRange },
			{ k: m.product_detail_spec_color_options(), v: product?.colorOptions },
			{ k: m.product_detail_spec_brand_origin(), v: product?.brand }
		].filter((row) => row.v)
	);

	const structuralAdvantages = $derived(
		product?.advantages
			? product.advantages
					.split('\n')
					.filter(Boolean)
					.map((line) => {
						const parts = line.split(':');
						return parts.length > 1
							? { title: parts[0].trim(), desc: parts.slice(1).join(':').trim() }
							: { title: m.product_detail_default_feature(), desc: line.trim() };
					})
			: []
	);

	function selectColor(colorId: number) {
		selectedColorId = colorId;
		// Re-anchor the sliders to the first available (in-stock, priced) variant
		// in that color — the option lists themselves are re-derived from it.
		const match =
			variants.find((v) => v.colorId === colorId && v.price !== null && v.quantity > 0) ??
			variants.find((v) => v.colorId === colorId);
		if (match) applyVariantToConfigurator(match);
	}

	// Point every slider at a specific variant's spec — used when a gallery
	// thumbnail, the "add" button in the full matrix, or a colour swap picks a
	// concrete variant rather than the customer dragging the sliders themselves.
	function applyVariantToConfigurator(v: Variant) {
		if (v.thicknessValue != null) {
			const idx = thicknessOptions.indexOf(Number(v.thicknessValue));
			if (idx >= 0) thicknessIndex = idx;
		}
		if (v.widthValue != null) {
			const idx = widthOptions.indexOf(Number(v.widthValue));
			if (idx >= 0) widthIndex = idx;
		}
		if (!v.isCustomLength && v.lengthValue != null) {
			const idx = catalogLengthOptions.indexOf(Number(v.lengthValue));
			if (idx >= 0) lengthIndex = idx;
			customLengthTouched = false;
		}
	}

	function addToCart() {
		if (justAdded || !selectedVariant || selectedVariant.price === null) return;

		cart.addItem(
			{
				variantId: selectedVariant.variantId,
				productId: product.id,
				productName: product.name,
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
				lengthUnit: selectedVariant.lengthUnit ?? null,
				isCustomLength: selectedVariant.isCustomLength,
				specLabel: variantLabel(selectedVariant),
				imageUrl: selectedVariant.imageUrl
			},
			quantity
		);

		cart.open();
		justAdded = true;
		toast.success(m.product_detail_added_to_cart({ productName: product.name }), {
			description: m.product_detail_added_to_order_sheet_toast({ quantity })
		});

		setTimeout(() => {
			justAdded = false;
		}, 1500);
	}

	function handleShare() {
		navigator.clipboard.writeText(window.location.href);
		toast.success(m.product_detail_link_copied());
	}

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	function printSpecSheet() {
		const printWindow = window.open('', '_blank');
		if (!printWindow) return;

		const specRowsHtml = specRows
			.map(
				(row) =>
					`<tr><td>${escapeHtml(row.k)}</td><td>${escapeHtml(String(row.v ?? ''))}</td></tr>`
			)
			.join('');

		const variantsHtml = hasVariants
			? `
				<h2>${escapeHtml(m.product_detail_full_spec_matrix())}</h2>
				<table>
					<thead>
						<tr>
							<th>${escapeHtml(m.product_detail_table_color())}</th>
							<th>${escapeHtml(m.product_detail_table_width())}</th>
							<th>${escapeHtml(m.product_detail_table_thickness())}</th>
							<th>${escapeHtml(m.product_detail_table_length())}</th>
							<th>${escapeHtml(m.product_detail_table_sku())}</th>
							<th>${escapeHtml(m.product_detail_table_price())}</th>
						</tr>
					</thead>
					<tbody>
						${variants
							.map(
								(v) => `
							<tr>
								<td>${escapeHtml(v.colorName ?? '—')}</td>
								<td>${escapeHtml(v.widthLabel || (v.widthValue ? `${v.widthValue}${v.widthUnit ?? ''}` : '—'))}</td>
								<td>${escapeHtml(v.thicknessValue ? `${v.thicknessValue}${v.thicknessUnit ?? ''}` : '—')}</td>
								<td>${escapeHtml(v.lengthLabel || (v.lengthValue ? `${v.lengthValue}${v.lengthUnit ?? ''}` : '—'))}</td>
								<td>${escapeHtml(v.sku ?? '—')}</td>
								<td>${escapeHtml(v.price !== null ? `${Number(v.price).toLocaleString()} ETB` : m.product_detail_quote_only())}</td>
							</tr>`
							)
							.join('')}
					</tbody>
				</table>`
			: '';

		printWindow.document.write(`
			<!doctype html>
			<html>
				<head>
					<meta charset="utf-8" />
					<title>${escapeHtml(product.name)}</title>
					<style>
						body { font-family: system-ui, sans-serif; padding: 32px; color: #0f172a; }
						h1 { font-size: 22px; margin-bottom: 4px; }
						h2 { font-size: 16px; margin-top: 32px; margin-bottom: 8px; }
						p { color: #475569; font-size: 13px; max-width: 640px; }
						table { width: 100%; border-collapse: collapse; font-size: 13px; }
						th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
						th { background: #f1f5f9; }
					</style>
				</head>
				<body>
					<h1>${escapeHtml(product.name)}</h1>
					${product.overview || product.description ? `<p>${escapeHtml(product.overview || product.description || '')}</p>` : ''}
					<h2>${escapeHtml(m.product_detail_technical_specifications())}</h2>
					<table>
						<tbody>${specRowsHtml}</tbody>
					</table>
					${variantsHtml}
				</body>
			</html>
		`);
		printWindow.document.close();
		printWindow.focus();
		printWindow.print();
	}
</script>

<main class="mx-auto max-w-[1320px] px-7 pt-11 pb-24 text-slate-900 dark:text-slate-100">
	<div class="mb-6 flex items-center gap-2 font-mono text-xs text-slate-500 dark:text-slate-400">
		<a href="/" class="transition-colors hover:text-slate-900 dark:hover:text-white"
			>{m.product_detail_breadcrumb_home()}</a
		>
		<span>/</span>
		<a href="/shop" class="transition-colors hover:text-slate-900 dark:hover:text-white"
			>{m.product_detail_breadcrumb_products()}</a
		>
		<span>/</span>
		<span class="text-slate-700 dark:text-slate-300">{product.name}</span>
	</div>

	<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-2">
		<!-- Gallery -->
		<!--
			Sticky only from lg up, where the grid is genuinely two columns and
			pinning the gallery beside the configurator is the point.

			On mobile the grid collapses to ONE column, so a sticky gallery stayed
			pinned at top-24 while the configurator below it scrolled up into the
			same space — and because this wrapper has no z-index while the gallery
			card inside it is `relative`, the gallery painted OVER the configurator.
			The result: every control in the buy panel (colour swatches, the
			thickness/width/length sliders, quantity, and the "Add to Order Sheet"
			button) was unclickable on phones at every scroll position — taps
			landed on the gallery card instead.
		-->
		<div class="lg:sticky lg:top-24">
			<div
				class="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xl dark:border-white/10 dark:bg-slate-900/60 dark:shadow-2xl"
			>
				{#if displayImage}
					<img
						src="/files/{displayImage}"
						alt={product.name}
						class="h-[480px] w-full object-cover transition-all duration-300"
					/>
				{:else}
					<div
						class="flex h-[480px] w-full items-center justify-center bg-slate-100 dark:bg-slate-900"
					>
						<ShoppingCart size={48} class="text-slate-400/40 dark:text-slate-600/40" />
					</div>
				{/if}
			</div>

			{#if allGalleryImages.length > 0}
				<div class="mt-3.5 grid grid-cols-4 gap-3 sm:grid-cols-5">
					{#each allGalleryImages as img}
						<button
							type="button"
							class="h-20 overflow-hidden rounded-xl border-2 p-0 transition-all hover:opacity-90 {displayImage ===
							img
								? 'border-blue-600 ring-2 ring-blue-500/20 dark:border-blue-500'
								: 'border-slate-200 dark:border-white/10'}"
							onclick={() => {
								// Jump the sliders to whatever spec this gallery shot belongs to.
								const match = variants.find((v) => v.imageUrl === img);
								if (match) {
									if (match.colorId !== null) selectedColorId = match.colorId;
									applyVariantToConfigurator(match);
								}
							}}
						>
							<img
								src="/files/{img}"
								alt="Product thumbnail option"
								class="h-full w-full object-cover"
							/>
						</button>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Info & purchase panel -->
		<div>
			<span
				class="font-mono text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400"
			>
				{product?.categoryName || m.product_detail_default_category()}
			</span>
			<h1
				class="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[40px] dark:text-white"
			>
				{product.name}
			</h1>

			<div class="mt-3.5 flex items-center gap-3.5">
				<span
					class="flex items-center gap-1.5 text-xs font-bold {inStock
						? 'text-emerald-600 dark:text-emerald-400'
						: 'text-rose-600 dark:text-rose-500'}"
				>
					<span class="h-2 w-2 rounded-full {inStock ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
					{inStock ? m.product_detail_in_stock() : m.product_detail_out_of_stock()}
				</span>
			</div>

			<p class="mt-5 text-base leading-relaxed text-slate-600 dark:text-slate-300">
				{product.overview || product.description}
			</p>

			<div
				class="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5.5 shadow-sm dark:border-white/10 dark:bg-slate-900/60"
			>
				<div class="flex flex-wrap items-baseline justify-between gap-2">
					<div>
						<div
							class="font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
						>
							{m.product_detail_current_selection_price()}
						</div>
						<div class="mt-1 text-3xl font-extrabold text-blue-600 dark:text-blue-400">
							{#if isQuoteOnly}
								{m.product_detail_price_on_request()}
							{:else if numericPrice !== null}
								{numericPrice.toLocaleString()} ETB
							{:else}
								—
							{/if}
						</div>
					</div>
					<span class="max-w-[24ch] text-right text-xs text-slate-500 dark:text-slate-400"
						>{m.product_detail_volume_discounts()}</span
					>
				</div>

				<!-- Color swatches (real colorId/hex, not string guessing) -->
				{#if hasColorAxis}
					<div class="mt-4.5">
						<div
							class="mb-2.5 font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
						>
							{m.product_detail_color_profiles()}
						</div>
						<div class="flex flex-wrap gap-2.5">
							{#each availableColors as c (c.id)}
								<button
									type="button"
									class="h-8.5 w-8.5 rounded-lg border-2 transition-transform hover:scale-110 focus:ring-2 focus:ring-blue-500/50 focus:outline-none active:scale-95 {selectedColorId ===
									c.id
										? 'border-blue-600 ring-2 ring-blue-500/40 dark:border-blue-400'
										: 'border-slate-300 dark:border-white/20'}"
									style:background-color={c.hex ?? '#ccc'}
									title={c.name ?? ''}
									onclick={() => selectColor(c.id!)}
								></button>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Configure your steel: thickness/width step through real mill stops,
				     length can go fully custom (cut to order) when the product allows it. -->
				{#if thicknessOptions.length > 0}
					<div class="mt-4.5">
						<div class="mb-2 flex items-center justify-between">
							<span
								class="font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
								>{m.product_detail_spec_thickness_range()}</span
							>
							{#if thicknessOptions.length > 1}
								<span class="font-mono text-[10px] text-slate-400 dark:text-slate-500">
									{thicknessOptions[0]}–{thicknessOptions[thicknessOptions.length - 1]}{thicknessUnit}
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class={stepperBtnClass}
								disabled={thicknessIndex <= 0}
								onclick={() => (thicknessIndex = Math.max(0, thicknessIndex - 1))}
								aria-label={m.product_detail_decrease()}
							>
								<MinusIcon size={14} />
							</button>
							<div class="relative flex-1">
								<input
									type="number"
									inputmode="decimal"
									class={numberInputClass}
									value={thicknessOptions[thicknessIndex]}
									onchange={(e) =>
										(thicknessIndex = nearestIndex(Number(e.currentTarget.value), thicknessOptions))}
								/>
								<span
									class="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-slate-400 dark:text-slate-500"
									>{thicknessUnit === 'gauge' ? 'ga' : thicknessUnit}</span
								>
							</div>
							<button
								type="button"
								class={stepperBtnClass}
								disabled={thicknessIndex >= thicknessOptions.length - 1}
								onclick={() =>
									(thicknessIndex = Math.min(thicknessOptions.length - 1, thicknessIndex + 1))}
								aria-label={m.product_detail_increase()}
							>
								<PlusIcon size={14} />
							</button>
						</div>
					</div>
				{/if}

				{#if widthOptions.length > 0}
					<div class="mt-4.5">
						<div class="mb-2 flex items-center justify-between">
							<span
								class="font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
								>{m.product_detail_spec_standard_width()}</span
							>
							{#if widthOptions.length > 1}
								<span class="font-mono text-[10px] text-slate-400 dark:text-slate-500">
									{widthOptions[0]}–{widthOptions[widthOptions.length - 1]}{widthUnit}
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class={stepperBtnClass}
								disabled={widthIndex <= 0}
								onclick={() => (widthIndex = Math.max(0, widthIndex - 1))}
								aria-label={m.product_detail_decrease()}
							>
								<MinusIcon size={14} />
							</button>
							<div class="relative flex-1">
								<input
									type="number"
									inputmode="decimal"
									class={numberInputClass}
									value={widthOptions[widthIndex]}
									onchange={(e) =>
										(widthIndex = nearestIndex(Number(e.currentTarget.value), widthOptions))}
								/>
								<span
									class="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-slate-400 dark:text-slate-500"
									>{widthUnit}</span
								>
							</div>
							<button
								type="button"
								class={stepperBtnClass}
								disabled={widthIndex >= widthOptions.length - 1}
								onclick={() => (widthIndex = Math.min(widthOptions.length - 1, widthIndex + 1))}
								aria-label={m.product_detail_increase()}
							>
								<PlusIcon size={14} />
							</button>
						</div>
					</div>
				{/if}

				{#if allowsCustomLength}
					<div class="mt-4.5">
						<div class="mb-2 flex items-center justify-between">
							<span
								class="font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
								>{m.product_detail_table_length()} — {m.product_detail_cut_to_order()}</span
							>
							<span class="font-mono text-[10px] text-slate-400 dark:text-slate-500">
								{m.product_detail_spec_size_profiles()}: {maxLengthValue}{maxLengthUnit} max
							</span>
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class={stepperBtnClass}
								disabled={customLength <= 0.1}
								onclick={() => {
									customLength = Math.max(0.1, Math.round((customLength - 0.5) * 10) / 10);
									customLengthTouched = true;
								}}
								aria-label={m.product_detail_decrease()}
							>
								<MinusIcon size={14} />
							</button>
							<div class="relative flex-1">
								<input
									type="number"
									inputmode="decimal"
									class={numberInputClass}
									value={useCustomLength ? customLength : (selectedCatalogLength ?? customLength)}
									min="0.1"
									max={maxLengthValue}
									step="0.1"
									onchange={(e) => {
										const raw = Number(e.currentTarget.value);
										customLength = Math.min(maxLengthValue, Math.max(0.1, Number.isNaN(raw) ? 0.1 : raw));
										customLengthTouched = true;
									}}
								/>
								<span
									class="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-slate-400 dark:text-slate-500"
									>{maxLengthUnit}</span
								>
							</div>
							<button
								type="button"
								class={stepperBtnClass}
								disabled={customLength >= maxLengthValue}
								onclick={() => {
									customLength = Math.min(maxLengthValue, Math.round((customLength + 0.5) * 10) / 10);
									customLengthTouched = true;
								}}
								aria-label={m.product_detail_increase()}
							>
								<PlusIcon size={14} />
							</button>
						</div>
						{#if isCustomLength}
							<p class="mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400">
								{m.product_detail_cut_to_order()} — {m.product_detail_request_quote_button()}
							</p>
						{/if}
					</div>
				{:else if catalogLengthOptions.length > 0}
					<div class="mt-4.5">
						<div class="mb-2 flex items-center justify-between">
							<span
								class="font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
								>{m.product_detail_table_length()}</span
							>
							{#if catalogLengthOptions.length > 1}
								<span class="font-mono text-[10px] text-slate-400 dark:text-slate-500">
									{catalogLengthOptions[0]}–{catalogLengthOptions[catalogLengthOptions.length - 1]}{catalogLengthUnit}
								</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<button
								type="button"
								class={stepperBtnClass}
								disabled={lengthIndex <= 0}
								onclick={() => (lengthIndex = Math.max(0, lengthIndex - 1))}
								aria-label={m.product_detail_decrease()}
							>
								<MinusIcon size={14} />
							</button>
							<div class="relative flex-1">
								<input
									type="number"
									inputmode="decimal"
									class={numberInputClass}
									value={catalogLengthOptions[lengthIndex]}
									onchange={(e) =>
										(lengthIndex = nearestIndex(Number(e.currentTarget.value), catalogLengthOptions))}
								/>
								<span
									class="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-slate-400 dark:text-slate-500"
									>{catalogLengthUnit}</span
								>
							</div>
							<button
								type="button"
								class={stepperBtnClass}
								disabled={lengthIndex >= catalogLengthOptions.length - 1}
								onclick={() =>
									(lengthIndex = Math.min(catalogLengthOptions.length - 1, lengthIndex + 1))}
								aria-label={m.product_detail_increase()}
							>
								<PlusIcon size={14} />
							</button>
						</div>
					</div>
				{/if}

				<div class="mt-4.5 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-white/10 dark:bg-slate-900">
					<span class="font-semibold">
						{selectedVariant
							? variantLabel(selectedVariant, { skipColor: true })
							: m.product_detail_choose_option()}
					</span>
					<span class="font-bold text-blue-600 dark:text-blue-400">
						{selectedVariant?.price != null
							? `${Number(selectedVariant.price).toLocaleString()} ETB`
							: m.product_detail_quote()}
					</span>
				</div>

				<div
					class="mt-5 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-200/50 px-3.5 py-2 dark:border-white/5 dark:bg-black/20"
				>
					<span class="font-mono text-xs text-slate-500 uppercase dark:text-slate-400"
						>{m.product_detail_quantity_label()}</span
					>
					<div class="flex items-center gap-3">
						<button
							type="button"
							class="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
							onclick={() => (quantity > 1 ? quantity-- : null)}><MinusIcon size={14} /></button
						>
						<span class="min-w-5 text-center font-mono text-sm font-bold">{quantity}</span>
						<button
							type="button"
							class="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
							onclick={() => quantity++}><PlusIcon size={14} /></button
						>
					</div>
				</div>

				<div class="mt-5.5 flex flex-wrap gap-2.5">
					{#if isQuoteOnly}
						<a
							href="/quotes?productId={product.id}{selectedVariant
								? `&variantId=${selectedVariant.variantId}`
								: ''}{!selectedVariant
								? `&note=${encodeURIComponent(
										`Requested spec: ` +
											(selectedThickness != null ? `${selectedThickness}${thicknessUnit} thickness, ` : '') +
											(selectedWidth != null ? `${selectedWidth}${widthUnit} width, ` : '') +
											(useCustomLength
												? `${customLength}${maxLengthUnit} length (cut to order)`
												: selectedCatalogLength != null
													? `${selectedCatalogLength}${catalogLengthUnit} length`
													: '')
									)}`
								: ''}"
							class="flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-700 to-slate-900 p-3.5 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-95"
						>
							{m.product_detail_request_quote_button()}
						</a>
					{:else}
						<button
							type="button"
							onclick={addToCart}
							disabled={justAdded || !selectedVariant}
							class="flex min-w-[180px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 p-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-500/25 transition-transform active:scale-95 disabled:opacity-50 dark:from-blue-600 dark:to-blue-900"
						>
							{#if justAdded}
								<CheckIcon size={16} /> {m.product_detail_order_form_added()}
							{:else}
								<ShoppingCart size={16} /> {m.product_detail_add_to_order_sheet()}
							{/if}
						</button>
					{/if}
				</div>

				<div class="mt-2.5 flex gap-2.5">
					<button
						type="button"
						onclick={handleShare}
						class="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
					>  <Share2 size={16	} />
						{m.product_detail_share_link()}
					</button>
				</div>
			</div>

			<button type="button" onclick={printSpecSheet} class="mt-4.5 flex flex-wrap gap-3">
				<div
					class="flex min-w-[200px] flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-white/10 dark:bg-slate-900"
				>
					<span
						class="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-500"
					>
						<FileText size={17} />
					</span>
					<div>
						<div class="text-sm font-bold text-slate-800 dark:text-slate-200">
							{m.product_detail_tech_spec_sheet_title()}
						</div>
						<div class="text-xs text-slate-500 dark:text-slate-400">
							{m.product_detail_tech_spec_sheet_sub()}
						</div>
					</div>
				</div>
			</button>
		</div>
	</div>

	{#if accessories && accessories.length > 0}
		<div class="mt-14 rounded-3xl border border-blue-100 bg-blue-50/60 p-6 dark:border-blue-500/15 dark:bg-blue-500/[0.04] sm:p-8">
			<div class="mb-1 flex flex-wrap items-center gap-3">
				<h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
					{m.product_detail_accessories_title()}
				</h2>
				<span
					class="rounded-full bg-blue-600 px-2.5 py-1 text-[10.5px] font-bold tracking-wide text-white uppercase dark:bg-blue-500"
				>
					{m.product_detail_accessories_badge()}
				</span>
			</div>
			<p class="mb-6 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
				{m.product_detail_accessories_subtitle()}
			</p>
			<div class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
				{#each accessories as a (a.id)}
					<ProductCard
						productId={a.productId}
						productName={a.productName}
						slug={a.slug}
						image={a.image}
						categoryName={a.categoryName}
						brand={a.brand}
						coatingType={a.coatingType}
						thickness={a.thickness}
						width={a.width}
						minPrice={a.minPrice}
						maxPrice={a.maxPrice}
						hasQuoteOnlyVariant={a.hasQuoteOnlyVariant}
						totalQuantity={a.totalQuantity}
						soldBy={a.soldBy}
						variants={a.variants}
					/>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Specs + advantages -->
	<div class="mt-16 grid grid-cols-1 gap-9 lg:grid-cols-2">
		<div>
			<div class="mb-5 flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-2xl font-extrabold text-slate-900 dark:text-white">
					{m.product_detail_technical_specifications()}
				</h2>
				<button
					type="button"
					onclick={printSpecSheet}
					class="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
				>
					<Printer size={14} />
					{m.product_detail_print_spec_sheet()}
				</button>
			</div>
			<div
				class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900"
			>
				{#each specRows as row}
					<div
						class="flex justify-between border-b border-slate-200/60 px-5 py-3.5 text-sm last:border-b-0 dark:border-white/5"
					>
						<span class="text-slate-500 dark:text-slate-400">{row.k}</span>
						<span class="text-right font-semibold text-slate-800 dark:text-slate-200">{row.v}</span>
					</div>
				{/each}
			</div>

			{#if product.applications}
				<h2 class="mt-9 mb-4 text-2xl font-extrabold text-slate-900 dark:text-white">
					{m.product_detail_applications()}
				</h2>
				<p class="text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
					{product.applications}
				</p>
			{/if}
		</div>

		<div>
			<h2 class="mb-5 text-2xl font-extrabold text-slate-900 dark:text-white">
				{m.product_detail_advantages()}
			</h2>
			{#if structuralAdvantages.length > 0}
				<div class="flex flex-col gap-3">
					{#each structuralAdvantages as adv}
						<div
							class="flex gap-3.5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-slate-900"
						>
							<span
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400"
							>
								<CheckIcon size={14} strokeWidth={2.4} />
							</span>
							<div>
								<div class="text-sm font-bold text-slate-900 dark:text-white">{adv.title}</div>
								<div class="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
									{adv.desc}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}

			{#if product.performanceFeatures}
				<h2 class="mt-9 mb-4 text-2xl font-extrabold text-slate-900 dark:text-white">
					{m.product_detail_performance_features()}
				</h2>
				<p class="text-sm leading-relaxed whitespace-pre-line text-slate-600 dark:text-slate-300">
					{product.performanceFeatures}
				</p>
			{/if}
		</div>
	</div>

	<!-- Full variant matrix: every color/width/thickness/length combo, its own price,
         SKU, and stock status — but never the raw stock count. -->
	{#if hasVariants}
		<div class="mt-16">
			<h2 class="mb-5 text-2xl font-extrabold text-slate-900 dark:text-white">
				{m.product_detail_full_spec_matrix()}
			</h2>
			<div class="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
				<table class="w-full min-w-[640px] border-collapse text-left text-sm">
					<thead>
						<tr class="bg-slate-100 dark:bg-slate-900">
							<th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"
								>{m.product_detail_table_color()}</th
							>
							<th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"
								>{m.product_detail_table_width()}</th
							>
							<th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"
								>{m.product_detail_table_thickness()}</th
							>
							<th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"
								>{m.product_detail_table_length()}</th
							>
							<th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"
								>{m.product_detail_table_sku()}</th
							>
							<th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"
								>{m.product_detail_table_price()}</th
							>
							<th class="px-4 py-3 font-semibold text-slate-600 dark:text-slate-300"
								>{m.product_detail_table_status()}</th
							>
							<th class="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody>
						{#each variants as v (v.variantId)}
							<tr class="border-t border-slate-200 dark:border-white/5">
								<td class="px-4 py-3">
									{#if v.colorName}
										<span class="flex items-center gap-2">
											<span
												class="h-3.5 w-3.5 rounded-full border border-slate-300 dark:border-white/20"
												style:background-color={v.colorHex ?? '#ccc'}
											></span>
											{v.colorName}
										</span>
									{:else}
										—
									{/if}
								</td>
								<td class="px-4 py-3"
									>{v.widthLabel || (v.widthValue ? `${v.widthValue}${v.widthUnit}` : '—')}</td
								>
								<td class="px-4 py-3"
									>{v.thicknessValue ? `${v.thicknessValue}${v.thicknessUnit}` : '—'}</td
								>
								<td class="px-4 py-3">
									{v.lengthLabel || (v.lengthValue ? `${v.lengthValue}${v.lengthUnit}` : '—')}
									{v.isCustomLength ? ` ${m.product_detail_cut_to_order()}` : ''}
								</td>
								<td class="px-4 py-3 font-mono text-xs text-slate-500">{v.sku ?? '—'}</td>
								<td class="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
									{v.price !== null
										? `${Number(v.price).toLocaleString()} ETB`
										: m.product_detail_quote_only()}
								</td>
								<td class="px-4 py-3">
									<span
										class="text-xs font-bold {v.quantity > 0
											? 'text-emerald-600 dark:text-emerald-400'
											: 'text-rose-600 dark:text-rose-500'}"
									>
										{v.quantity > 0
											? m.product_detail_in_stock_short()
											: m.product_detail_out_of_stock()}
									</span>
								</td>
								<td class="px-4 py-3 text-right">
									{#if v.price !== null}
										<button
											type="button"
											class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
											onclick={() => {
												if (v.colorId !== null) selectedColorId = v.colorId;
												applyVariantToConfigurator(v);
												cart.addItem(
													{
														variantId: v.variantId,
														productId: product.id,
														productName: product.name,
														sku: v.sku,
														price: Number(v.price),
														priceIncludesVat: false,
														colorId: v.colorId,
														colorName: v.colorName,
														width: v.widthValue != null ? Number(v.widthValue) : null,
														widthUnit: v.widthUnit,
														thickness: v.thicknessValue != null ? Number(v.thicknessValue) : null,
														thicknessUnit: v.thicknessUnit,
														length: v.lengthValue != null ? Number(v.lengthValue) : null,
														lengthUnit: v.lengthUnit ?? null,
														isCustomLength: v.isCustomLength,
														specLabel: variantLabel(v),
														imageUrl: v.imageUrl
													},
													1
												);
												cart.open();
												toast.success(m.product_detail_added_to_cart({ productName: product.name }), {
													description: m.product_detail_added_to_order_sheet_toast({ quantity: 1 })
												});
											}}
										>
											{m.product_detail_add_button()}
										</button>
									{:else}
										<a
											href="/quotes?productId={product.id}&variantId={v.variantId}"
											class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5"
										>
											{m.product_detail_quote()}
										</a>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}

	{#if relatedProducts && relatedProducts.length > 0}
		<div class="mt-16">
			<h2 class="mb-5.5 text-2xl font-extrabold text-slate-900 dark:text-white">
				{m.product_detail_related_products()}
			</h2>
			<div class="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
				{#each relatedProducts as p}
					<a href="/shop/single/{p.slug}" class="group block text-inherit no-underline">
						<div
							class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition-transform duration-300 group-hover:-translate-y-1 dark:border-white/10 dark:bg-slate-900"
						>
							<div class="h-42 overflow-hidden">
								<img
									src="/files/{p.featuredImage}"
									alt={p.name}
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							</div>
							<div class="p-4">
								<h3
									class="truncate text-base font-bold text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white dark:group-hover:text-blue-400"
								>
									{p.name}
								</h3>
								<div class="mt-2 flex items-center justify-between">
									<span class="font-mono text-xs text-blue-600 dark:text-blue-400"
										>{p.thickness || m.product_detail_specs_fallback()}</span
									>
									<span class="text-xs font-bold text-blue-600 dark:text-blue-400"
										>{m.product_detail_view_specs()}</span
									>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	{/if}
</main>
