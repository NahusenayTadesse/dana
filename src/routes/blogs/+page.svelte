<script lang="ts">
	import Seo from '$lib/components/Seo.svelte';
	import PortfolioHero from '$lib/components/blogs/portfolio-hero.svelte';
	import PortfolioFilters from '$lib/components/blogs/portfolio-filters.svelte';
	import PortfolioGrid from '$lib/components/blogs/portfolio-grid.svelte';
	import type { BlogItem } from '$lib/data/portfolio';
	import * as m from '$lib/paraglide/messages.js';

	let searchQuery = $state('');
	let selectedCategory = $state<string | null>(null);
	let { data } = $props();

	const filteredItems = $derived.by(() => {
		let items: BlogItem[] = data?.portfolioItems ?? [];

		if (selectedCategory) {
			items = items.filter((item) => item.category === selectedCategory);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();

			items = items.filter(
				(item) =>
					item.title.toLowerCase().includes(query) ||
					item.excerpt?.toLowerCase().includes(query) ||
					item.category?.toLowerCase().includes(query) ||
					item.content?.toLowerCase().includes(query)
			);
		}

		return items;
	});

	const resultsCount = $derived(filteredItems.length);
</script>

<Seo title={m.blog_meta_title()} description={m.blog_meta_description()} />

<div class="min-h-dvh  text-foreground">
	<PortfolioHero />

	<main class="mx-auto mt-10 max-w-7xl px-4 pb-20">
		<div class="mb-10">
			<PortfolioFilters
				portfolioItems={data?.portfolioItems}
				bind:searchQuery
				placeholder={m.blog_search_placeholder()}
				bind:selectedEventType={selectedCategory}
			/>
		</div>

		<div class="mb-6 text-center">
			<p class="text-sm text-muted-foreground">
				{m.blog_showing()} <span class="font-semibold text-foreground">{resultsCount}</span>
				{resultsCount === 1 ? m.blog_article_singular() : m.blog_article_plural()}
			</p>
		</div>

		<PortfolioGrid items={filteredItems} />
	</main>
</div>
