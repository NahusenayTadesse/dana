<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { SearchIcon, XIcon } from '@lucide/svelte';
	import type { BlogItem } from '$lib/data/portfolio';
	import * as m from '$lib/paraglide/messages.js';

	let {
		searchQuery = $bindable(''),
		portfolioItems,
		selectedEventType = $bindable<string | null>(null),
		placeholder = m.portfolio_filters_search_placeholder()
	}: {
		searchQuery: string;
		portfolioItems: BlogItem[];
		selectedEventType: string | null;
		placeholder?: string;
	} = $props();

	const blogCategories = [
		...new Set(portfolioItems.map((item) => item.category).filter(Boolean))
	] as string[];

	const clearFilters = () => {
		searchQuery = '';
		selectedEventType = null;
	};

	const hasActiveFilters = $derived(searchQuery.length > 0 || selectedEventType !== null);
</script>

<div class="space-y-6">
	<div class="relative mx-auto max-w-md">
		<SearchIcon class="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
		<Input
			type="text"
			{placeholder}
			bind:value={searchQuery}
			class="h-12 rounded-full border-2 border-border bg-background/80 pr-4 pl-12 text-base backdrop-blur-sm focus:border-primary"
		/>
		{#if searchQuery.length > 0}
			<Button
				variant="ghost"
				size="icon"
				class="absolute top-1/2 right-2 size-8 -translate-y-1/2 rounded-full"
				onclick={() => (searchQuery = '')}
				aria-label={m.portfolio_filters_clear_search_aria()}
			>
				<XIcon class="size-4" />
			</Button>
		{/if}
	</div>

	<div class="flex flex-wrap items-center justify-center gap-2">
		<Button
			variant={selectedEventType === null ? 'default' : 'outline'}
			size="sm"
			class="rounded-full"
			onclick={() => (selectedEventType = null)}
		>
			{m.portfolio_filters_all_blogs()}
		</Button>

		{#each blogCategories as eventType}
			<Button
				variant={selectedEventType === eventType ? 'default' : 'outline'}
				size="sm"
				class="rounded-full"
				onclick={() => (selectedEventType = selectedEventType === eventType ? null : eventType)}
			>
				{eventType}
			</Button>
		{/each}

		{#if hasActiveFilters}
			<Button
				variant="ghost"
				size="sm"
				class="rounded-full text-muted-foreground hover:text-foreground"
				onclick={clearFilters}
				aria-label={m.portfolio_filters_clear_filters_aria()}
			>
				<XIcon class="mr-1 size-4" />
				{m.portfolio_filters_clear()}
			</Button>
		{/if}
	</div>
</div>
