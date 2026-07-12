<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';

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

	const { item }: { item: BlogItem } = $props();

	const formattedDate = $derived(
		item.date
			? new Date(item.date).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})
			: null
	);
</script>

<Card
	class="group shadow-lg-lg hover:shadow-lg-xl overflow-hidden border-0 bg-card transition-all duration-300 hover:-translate-y-1"
>
	<a href="/blogs/{item?.slug}" class="relative aspect-4/3 overflow-hidden">
		<img
			src="/files/{item?.featuredImage}"
			alt={item.title}
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
		/>
		<div
			class="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
		></div>
		{#if item.category}
			<Badge class="absolute top-4 left-4 bg-primary/90 text-primary-foreground backdrop-blur-sm">
				{item.category}
			</Badge>
		{/if}
	</a>
	<CardContent class="space-y-3 p-5">
		<h3
			class="line-clamp-1 text-lg font-semibold text-foreground transition-colors group-hover:text-primary"
		>
			{item.title}
		</h3>
		{#if item.excerpt}
			<p class="line-clamp-2 text-sm text-muted-foreground">
				{item.excerpt}
			</p>
		{/if}
	</CardContent>
</Card>
