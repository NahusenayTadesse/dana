<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDownIcon } from '@lucide/svelte';

	type catItem = {
		name: string;
	};

	const { names = [], title = 'Categories' }: { names: catItem[]; title: string } = $props();
</script>

<Popover>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button variant="outline" size="sm" {...props} class="gap-2">
				View {title}
				<ChevronDownIcon class="size-4" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-56 p-0">
		<div class="flex flex-col divide-y">
			<div class="px-4 py-3">
				<p class="text-sm font-semibold text-foreground">{title}</p>
			</div>
			<div class="max-h-64 overflow-y-auto">
				{#if names.length > 0}
					<ul class="list-disc pl-5">
						{#each names as price}
							<li class="py-1.5 transition-colors hover:bg-muted/50">
								<span class="text-sm">{price}</span>
							</li>
						{/each}
					</ul>
				{:else}
					<div class="px-4 py-6 text-center">
						<p class="text-sm text-muted-foreground">No Categories Available</p>
					</div>
				{/if}
			</div>
		</div>
	</PopoverContent>
</Popover>
