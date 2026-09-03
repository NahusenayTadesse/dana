<script lang="ts">
	import { assetUrl } from '$lib/utils';
	import { ImageOff } from '@lucide/svelte';

	/**
	 * Thumbnail stack for one slot's current images. Shows the first few and a
	 * "+n" chip for the rest, so a 27-image gallery still fits in a table cell.
	 */
	let { values = [], label = '' }: { values?: string[]; label?: string } = $props();

	const MAX_THUMBS = 3;
	const shown = $derived(values.slice(0, MAX_THUMBS));
	const overflow = $derived(Math.max(0, values.length - MAX_THUMBS));
</script>

<div class="flex items-center -space-x-3">
	{#if shown.length === 0}
		<div
			class="flex size-11 items-center justify-center rounded-lg border border-dashed bg-muted text-muted-foreground"
		>
			<ImageOff class="size-4" />
		</div>
	{/if}

	{#each shown as value, i (value + i)}
		<img
			src={assetUrl(value)}
			alt="{label} preview {i + 1}"
			loading="lazy"
			class="size-11 rounded-lg border-2 border-background bg-muted object-cover shadow-sm"
			style="z-index: {MAX_THUMBS - i}"
		/>
	{/each}

	{#if overflow > 0}
		<span
			class="flex size-11 items-center justify-center rounded-lg border-2 border-background bg-secondary text-[11px] font-bold text-secondary-foreground shadow-sm"
		>
			+{overflow}
		</span>
	{/if}
</div>
