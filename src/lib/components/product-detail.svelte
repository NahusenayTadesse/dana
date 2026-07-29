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
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
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
		widthUnit: string | null;
		widthLabel: string | null;
		thicknessValue: string | number | null;
		thicknessUnit: string | null;
		lengthValue?: string | number | null;
		lengthUnit?: string | null;
		lengthLabel?: string | null;
		isCustomLength?: boolean;
	};

	type RelatedProduct = {
		id: number;
		slug: string;
		name: string;
		featuredImage: string | null;
		thickness?: string | null;
	};

	type Props = {
		product: ProductInfo;
		images?: string[]; // extra gallery shots from product_images
		variants?: Variant[];
		relatedProducts?: RelatedProduct[];
	};

	const { product, images = [], variants = [], relatedProducts = [] }: Props = $props();

	const cart = useCart();

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
	let selectedVariantId = $state<number | undefined>(defaultVariant?.variantId);

	// Every variant matching the currently selected color (or all, if this product has no color axis)
	const variantsForSelectedColor = $derived(
		hasColorAxis ? variants.filter((v) => v.colorId === selectedColorId) : variants
	);

	const selectedVariant = $derived(
		variants.find((v) => v.variantId === selectedVariantId) ?? defaultVariant
	);

	const displayImage = $derived(
		selectedVariant?.imageUrl || product?.featuredImage || allGalleryImages[0] || ''
	);

	let quantity = $state(1);
	let justAdded = $state(false);

	const isQuoteOnly = $derived(selectedVariant ? selectedVariant.price === null : false);
	const inStock = $derived(selectedVariant ? selectedVariant.quantity > 0 : product.quantity > 0);
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
		// Auto-pick the first available (in-stock, priced) variant in that color
		const match =
			variants.find((v) => v.colorId === colorId && v.price !== null && v.quantity > 0) ??
			variants.find((v) => v.colorId === colorId);
		if (match) selectedVariantId = match.variantId;
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
				specLabel: variantLabel(selectedVariant),
				imageUrl: selectedVariant.imageUrl
			},
			quantity
		);

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
		<div class="sticky top-24">
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
								// Only overrides the picture — doesn't change the selected variant,
								// since a gallery shot isn't necessarily this exact spec combo.
								const match = variants.find((v) => v.imageUrl === img);
								if (match) selectedVariantId = match.variantId;
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

				<!-- Width/thickness/length picker for the selected color -->
				{#if variantsForSelectedColor.length > 0}
					<div class="mt-4">
						<div
							class="mb-2 font-mono text-xs font-semibold tracking-widest text-slate-500 uppercase dark:text-slate-400"
						>
							{m.product_detail_select_dimension_profile()}
						</div>
						<Select
							type="single"
							value={selectedVariantId ? String(selectedVariantId) : undefined}
							onValueChange={(val) => (selectedVariantId = val ? Number(val) : undefined)}
						>
							<SelectTrigger
								class="h-auto w-full rounded-xl border border-slate-200 bg-white p-3 text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
							>
								<div class="flex w-full items-center justify-between gap-2 text-left">
									<span class="text-sm font-semibold">
										{selectedVariant
											? variantLabel(selectedVariant, { skipColor: true })
											: m.product_detail_choose_option()}
									</span>
									<span class="text-sm font-bold text-blue-600 dark:text-blue-400">
										{selectedVariant?.price != null
											? `${Number(selectedVariant.price).toLocaleString()} ETB`
											: m.product_detail_quote()}
									</span>
								</div>
							</SelectTrigger>
							<SelectContent
								class="rounded-xl border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-900 dark:text-white"
							>
								{#each variantsForSelectedColor as v (v.variantId)}
									<SelectItem
										value={String(v.variantId)}
										class="cursor-pointer transition-colors hover:bg-slate-100 focus:bg-slate-100 dark:focus:bg-white/5 dark:focus:text-white"
									>
										<div class="flex w-full items-center justify-between gap-12">
											<span class="text-xs font-medium">{variantLabel(v, { skipColor: true })}</span
											>
											<span class="text-xs font-bold text-blue-600 dark:text-blue-400">
												{v.price !== null
													? `${Number(v.price).toLocaleString()} ETB`
													: m.product_detail_quote()}
											</span>
										</div>
									</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				{/if}

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
							href="/quote?productId={product.id}{selectedVariant
								? `&variantId=${selectedVariant.variantId}`
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
												selectedVariantId = v.variantId;
												selectedColorId = v.colorId;
												addToCart();
											}}
										>
											{m.product_detail_add_button()}
										</button>
									{:else}
										<a
											href="/quote?productId={product.id}&variantId={v.variantId}"
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
