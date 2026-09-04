<script lang="ts">
	import { tick } from 'svelte';
	import {
		Search,
		Download,
		LifeBuoy,
		ChevronDown,
		X,
		Rocket,
		Package,
		Receipt,
		Users,
		Globe,
		Boxes,
		HardHat,
		SlidersHorizontal,
		ChartArea,
		CircleHelp
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index';
	import { Input } from '$lib/components/ui/input/index';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { printElement } from '$lib/print';
	import { HELP_SECTIONS, ALL_TOPICS, TOPIC_COUNT, searchIndex } from '$lib/help/content';
	import RichText from '$lib/help/rich-text.svelte';
	import Manual from '$lib/help/manual.svelte';

	let query = $state('');
	let open = $state<Record<string, boolean>>({});
	let downloading = $state(false);

	const sectionIcons: Record<string, typeof Rocket> = {
		start: Rocket,
		catalogue: Package,
		selling: Receipt,
		customers: Users,
		website: Globe,
		stock: Boxes,
		people: HardHat,
		settings: SlidersHorizontal,
		reports: ChartArea,
		questions: CircleHelp
	};

	// Built once, not per keystroke: the haystack for each topic never changes,
	// only the needle does.
	const haystacks = ALL_TOPICS.map((topic) => ({ topic, text: searchIndex(topic) }));

	const needle = $derived(query.trim().toLowerCase());

	const matches = $derived(
		needle ? new Set(haystacks.filter((h) => h.text.includes(needle)).map((h) => h.topic.id)) : null
	);

	const matchCount = $derived(matches ? matches.size : TOPIC_COUNT);

	// A section disappears entirely when nothing in it matches, so the page does
	// not become a list of empty headings.
	const visibleSections = $derived(
		HELP_SECTIONS.map((section) => ({
			...section,
			Icon: sectionIcons[section.id] ?? CircleHelp,
			topics: section.topics.filter((topic) => !matches || matches.has(topic.id))
		})).filter((section) => section.topics.length > 0)
	);

	// While searching, every match is already open — hunting through collapsed
	// results would defeat the search.
	//
	// Both halves are coerced: `open[id]` is undefined until a row has been
	// touched, and Svelte drops an attribute set to undefined, which left
	// aria-expanded missing entirely on every untouched row.
	const isOpen = (id: string) => Boolean(matches) || Boolean(open[id]);

	function toggle(id: string) {
		if (matches) return;
		open[id] = !open[id];
	}

	function expandAll(value: boolean) {
		open = value ? Object.fromEntries(ALL_TOPICS.map((t) => [t.id, true])) : {};
	}

	async function jumpTo(id: string) {
		query = '';
		await tick();
		document.getElementById(`section-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	/**
	 * Hands the hidden manual to the browser's print dialog, where "Save as PDF"
	 * writes the file. Same route every other export in this dashboard takes —
	 * printing the real page is what keeps the logo and the layout intact.
	 */
	async function downloadManual() {
		downloading = true;
		try {
			await printElement('#help-manual', {
				fileName: 'Dana Steel — Dashboard Manual',
				orientation: 'portrait'
			});
		} finally {
			downloading = false;
		}
	}
</script>

<svelte:head>
	<title>Help</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="flex items-center gap-2 text-xl font-semibold">
				<LifeBuoy class="h-5 w-5" /> Help
			</h1>
			<p class="max-w-[70ch] text-sm text-muted-foreground">
				Every screen in this dashboard, explained. Search for what you are trying to do, or browse
				the sections below.
			</p>
		</div>

		<Button onclick={downloadManual} disabled={downloading}>
			<Download class="h-4 w-4" />
			{downloading ? 'Preparing…' : 'Download the manual'}
		</Button>
	</div>

	<!-- Search -->
	<div class="flex flex-col gap-3">
		<div class="relative">
			<Search
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<Input
				type="search"
				bind:value={query}
				placeholder="Search — try “phone number”, “VAT”, “add a product”, “promo code”…"
				class="h-11 pr-10 pl-9"
				aria-label="Search the help"
			/>
			{#if query}
				<button
					type="button"
					onclick={() => (query = '')}
					aria-label="Clear the search"
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<X class="h-4 w-4" />
				</button>
			{/if}
		</div>

		<div class="flex flex-wrap items-center gap-2">
			{#if needle}
				<Badge variant={matchCount ? 'secondary' : 'destructive'}>
					{matchCount}
					{matchCount === 1 ? 'topic' : 'topics'} matching “{query.trim()}”
				</Badge>
				<Button variant="ghost" size="sm" onclick={() => (query = '')}>Show everything</Button>
			{:else}
				<Badge variant="secondary">{TOPIC_COUNT} topics</Badge>
				<Button variant="ghost" size="sm" onclick={() => expandAll(true)}>Expand all</Button>
				<Button variant="ghost" size="sm" onclick={() => expandAll(false)}>Collapse all</Button>
			{/if}
		</div>
	</div>

	<!-- Jump links -->
	{#if !needle}
		<nav class="flex flex-wrap gap-2" aria-label="Jump to a section">
			{#each HELP_SECTIONS as section (section.id)}
				<Button variant="outline" size="sm" onclick={() => jumpTo(section.id)}>
					{section.title}
				</Button>
			{/each}
		</nav>
	{/if}

	<!-- Sections -->
	{#if visibleSections.length === 0}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<p class="font-semibold">Nothing matches “{query.trim()}”.</p>
			<p class="mt-1 text-sm text-muted-foreground">
				Try a plainer word — “price”, “picture”, “stock”, “email”. The search looks at every word in
				every answer, not just the headings.
			</p>
		</div>
	{/if}

	{#each visibleSections as section (section.id)}
		<section id="section-{section.id}" class="scroll-mt-6">
			<div class="mb-3 flex items-start gap-3 border-b pb-2">
				<span
					class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
				>
					<section.Icon class="h-4 w-4" />
				</span>
				<div>
					<h2 class="text-base font-semibold">{section.title}</h2>
					<p class="max-w-[75ch] text-sm text-muted-foreground">{section.blurb}</p>
				</div>
			</div>

			<div class="flex flex-col divide-y rounded-xl border">
				{#each section.topics as topic (topic.id)}
					<div>
						<button
							type="button"
							onclick={() => toggle(topic.id)}
							aria-expanded={isOpen(topic.id)}
							class="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50"
						>
							<div class="min-w-0 flex-1">
								<p class="font-semibold">{topic.title}</p>
								<p class="text-sm text-muted-foreground">{topic.summary}</p>
							</div>
							{#if !matches}
								<ChevronDown
									class="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none {isOpen(
										topic.id
									)
										? 'rotate-180'
										: ''}"
								/>
							{/if}
						</button>

						{#if isOpen(topic.id)}
							<div class="flex flex-col gap-3 px-4 pt-1 pb-5 text-sm">
								{#if topic.where}
									<p class="text-xs">
										<span
											class="mr-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase"
										>
											Where
										</span>
										<span class="font-medium text-primary">{topic.where}</span>
									</p>
								{/if}

								{#if topic.steps?.length}
									<ol class="ml-5 list-decimal space-y-1.5 marker:text-muted-foreground">
										{#each topic.steps as step, i (i)}
											<li class="pl-1"><RichText text={step} /></li>
										{/each}
									</ol>
								{/if}

								{#if topic.notes?.length}
									<ul class="ml-5 list-disc space-y-1.5 text-muted-foreground marker:text-primary/50">
										{#each topic.notes as note, i (i)}
											<li class="pl-1"><RichText text={note} /></li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}

	<p class="pt-2 text-xs text-muted-foreground">
		Can't find it? The manual covers the same ground in one document — press
		<strong class="font-semibold">Download the manual</strong> at the top, then choose "Save as PDF" in
		the print dialog.
	</p>
</div>

<!--
	The printable manual. Kept out of view rather than out of the page: the PDF
	is made by cloning this into the print sheet, so it has to exist in the DOM.
	`hidden` sits on the wrapper so the clone itself carries no hidden attribute.
-->
<div hidden>
	<div id="help-manual">
		<Manual />
	</div>
</div>
