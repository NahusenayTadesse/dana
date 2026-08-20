<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion';
	import {
		BookOpenIcon,
		ChevronDownIcon,
		MousePointerClickIcon,
		LayoutGridIcon,
		RulerIcon,
		CopyPlusIcon,
		PaletteIcon,
		CombineIcon,
		SigmaIcon,
		ReceiptIcon,
		DownloadIcon,
		SmartphoneIcon,
		SendIcon,
		PhoneIcon
	} from '@lucide/svelte';
	import { slide } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	/**
	 * "How this page works", collapsed to a single row until someone asks for it.
	 *
	 * /buy is aimed at contractors and homeowners rather than web users, and the
	 * page's two least obvious moves — length is set on the order and not on the
	 * card, and the blue Add button is what gets you a second length — are the
	 * ones people ring the sales desk about. Spelling them out inline would push
	 * the products themselves below the fold, so the whole guide lives behind one
	 * toggle and each answer behind its own.
	 *
	 * The cut-to-order table is built from the same product rows the page
	 * renders, not written out by hand: min/max/step are per-product admin
	 * settings, and a hard-coded "1m to 12m" here would go stale the first time
	 * one of them is edited.
	 */
	type GuideProduct = {
		productId: number;
		productName: string;
		isLengthCustomizable?: boolean | null;
		minLength?: number | null;
		maxLength?: number | null;
		maxLengthUnit?: string | null;
		lengthStep?: number | null;
	};

	let { products = [] }: { products?: GuideProduct[] } = $props();

	let open = $state(false);

	const num = (value: number) => String(Number(value));

	// Cut-to-order products first (they're the ones with something to explain),
	// then the fixed-length ones so a customer can see at a glance that theirs
	// isn't missing.
	const lengthRows = $derived(
		products.map((p) => {
			const custom = p.isLengthCustomizable === true && p.minLength != null && p.maxLength != null;
			const unit = p.maxLengthUnit ?? 'm';
			return {
				id: p.productId,
				name: p.productName,
				custom,
				text: custom
					? m.buy_guide_lengths_row({
							min: `${num(p.minLength as number)}${unit}`,
							max: `${num(p.maxLength as number)}${unit}`,
							step: `${num(p.lengthStep ?? 0.5)}${unit}`
						})
					: m.buy_guide_lengths_fixed()
			};
		})
	);

	const sortedLengthRows = $derived(
		[...lengthRows].sort((a, b) => Number(b.custom) - Number(a.custom))
	);

	const entries = [
		{ id: 'basics', icon: BookOpenIcon, q: m.buy_guide_basics_title, a: m.buy_guide_basics_body },
		{
			id: 'pick',
			icon: MousePointerClickIcon,
			q: m.buy_guide_pick_title,
			a: m.buy_guide_pick_body
		},
		{ id: 'blocks', icon: LayoutGridIcon, q: m.buy_guide_blocks_title, a: m.buy_guide_blocks_body },
		{ id: 'length', icon: RulerIcon, q: m.buy_guide_length_title, a: m.buy_guide_length_body },
		{ id: 'multi', icon: CopyPlusIcon, q: m.buy_guide_multi_title, a: m.buy_guide_multi_body },
		{ id: 'colour', icon: PaletteIcon, q: m.buy_guide_colour_title, a: m.buy_guide_colour_body },
		{
			id: 'duplicates',
			icon: CombineIcon,
			q: m.buy_guide_duplicates_title,
			a: m.buy_guide_duplicates_body
		},
		{ id: 'totals', icon: SigmaIcon, q: m.buy_guide_totals_title, a: m.buy_guide_totals_body },
		{ id: 'price', icon: ReceiptIcon, q: m.buy_guide_price_title, a: m.buy_guide_price_body },
		{ id: 'export', icon: DownloadIcon, q: m.buy_guide_export_title, a: m.buy_guide_export_body },
		{ id: 'saved', icon: SmartphoneIcon, q: m.buy_guide_saved_title, a: m.buy_guide_saved_body },
		{ id: 'after', icon: SendIcon, q: m.buy_guide_after_title, a: m.buy_guide_after_body }
	];
</script>

<section
	class="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-white/10 dark:bg-white/[0.03]"
>
	<!-- One row until asked for: the guide must never be the reason the products
	     are below the fold. -->
	<button
		type="button"
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls="buy-guide-panel"
		class="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-slate-100/70 dark:hover:bg-white/5"
	>
		<span
			class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
		>
			<BookOpenIcon class="size-4.5" />
		</span>

		<span class="min-w-0 flex-1">
			<span class="block text-sm font-bold text-slate-900 dark:text-white">
				{m.buy_guide_toggle_label()}
			</span>
			<span class="block truncate text-xs text-slate-500 dark:text-slate-400">
				{m.buy_guide_toggle_hint()}
			</span>
		</span>

		<span
			class="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
		>
			{open ? m.buy_guide_close() : m.buy_guide_open()}
			<ChevronDownIcon class="size-3.5 transition-transform {open ? 'rotate-180' : ''}" />
		</span>
	</button>

	{#if open}
		<div
			id="buy-guide-panel"
			transition:slide={{ duration: 220 }}
			class="border-t border-slate-200 px-4 py-4 dark:border-white/10"
		>
			<!-- No `collapsible` prop: bits-ui's single-type accordion already toggles an
			     open item shut, and passing it only produces a type error. -->
			<Accordion type="single" class="grid w-full items-start gap-2.5 md:grid-cols-2">
				{#each entries as entry (entry.id)}
					<AccordionItem
						value={entry.id}
						class="group overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900"
					>
						<AccordionTrigger class="px-3.5 py-3 text-left hover:no-underline">
							<span class="flex items-center gap-3">
								<span
									class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-data-[state=open]:bg-blue-600 group-data-[state=open]:text-white dark:bg-white/5 dark:text-slate-400"
								>
									<entry.icon class="size-4" />
								</span>
								<span
									class="text-[13px] font-bold text-slate-800 group-data-[state=open]:text-blue-700 dark:text-slate-100 dark:group-data-[state=open]:text-blue-300"
								>
									{entry.q()}
								</span>
							</span>
						</AccordionTrigger>

						<AccordionContent
							class="border-t border-slate-200 bg-slate-50/70 px-3.5 py-3 dark:border-white/10 dark:bg-white/[0.02]"
						>
							<p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
								{entry.a()}
							</p>

							<!-- The length answer is the one with per-product numbers behind
							     it, so it carries the table rather than repeating the ranges
							     in prose that would drift from the catalog. -->
							{#if entry.id === 'length' && sortedLengthRows.length > 0}
								<div class="mt-3 rounded-lg border border-slate-200 dark:border-white/10">
									<div
										class="border-b border-slate-200 px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase dark:border-white/10 dark:text-slate-500"
									>
										{m.buy_guide_lengths_title()}
									</div>
									<dl class="divide-y divide-slate-100 dark:divide-white/5">
										{#each sortedLengthRows as row (row.id)}
											<div class="flex items-baseline justify-between gap-3 px-3 py-1.5">
												<dt class="text-xs text-slate-600 dark:text-slate-300">{row.name}</dt>
												<dd
													class="shrink-0 font-mono text-[11px] font-semibold {row.custom
														? 'text-blue-600 dark:text-blue-400'
														: 'text-slate-400 dark:text-slate-500'}"
												>
													{row.text}
												</dd>
											</div>
										{/each}
									</dl>
								</div>
							{/if}
						</AccordionContent>
					</AccordionItem>
				{/each}
			</Accordion>

			<div
				class="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-blue-50 px-3.5 py-2.5 text-xs text-slate-600 dark:bg-blue-500/10 dark:text-slate-300"
			>
				<PhoneIcon class="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
				<span>{m.buy_guide_help()}</span>
				<a
					href="/contact-us"
					class="font-bold text-blue-700 underline underline-offset-2 dark:text-blue-300"
				>
					{m.buy_guide_help_link()}
				</a>
			</div>
		</div>
	{/if}
</section>
