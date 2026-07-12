<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import PortfolioCard from './portfolio-card.svelte';
	import { FolderOpenIcon } from '@lucide/svelte';
	type BlogItem = {
		id: number;
		title: string;
		slug: string;
		category: string;
		featuredImage: string | null;

		excerpt: string | null;
		content: string | null;
		createdAt: string | Date | null;
	};
	const { items }: { items: BlogItem[] } = $props();
</script>

{#if items.length > 0}
	<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
		{#each items as item, index (item.id)}
			<div in:fly={{ y: 20, duration: 400, delay: index * 50 }}>
				<PortfolioCard {item} />
			</div>
		{/each}
	</div>
{:else}
	<div
		class="flex flex-col items-center justify-center py-20 text-center"
		in:fade={{ duration: 300 }}
	>
		<div class="mb-4 flex size-20 items-center justify-center rounded-full bg-muted">
			<FolderOpenIcon class="size-10 text-muted-foreground" />
		</div>
		<h3 class="mb-2 text-xl font-semibold text-foreground">No blogs found</h3>
		<p class="max-w-sm text-muted-foreground">
			Try adjusting your search or filter criteria to find what you're looking for.
		</p>
	</div>
{/if}
