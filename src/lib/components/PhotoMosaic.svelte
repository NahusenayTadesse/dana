<script lang="ts">
	import { showcaseSrcset } from '$lib/showcaseGallery';

	/**
	 * Four photos as a decorative collage: a tall tile on the left, two
	 * stacked on the right, one wide tile underneath. No captions; hidden from
	 * assistive tech. Missing positions repeat the first photo.
	 */
	let { images, class: className = '' }: { images: string[]; class?: string } = $props();

	const tiles = ['row-span-2', '', '', 'col-span-2'];
</script>

{#if images.length}
	<div
		class={['grid auto-rows-[136px] grid-cols-[1.1fr_1fr] gap-3', className]}
		aria-hidden="true"
	>
		{#each tiles as tile, i (i)}
			{@const src = images[i] ?? images[0]}
			<img
				{src}
				srcset={showcaseSrcset(src)}
				sizes="(min-width: 1024px) 280px, 50vw"
				alt=""
				loading="lazy"
				decoding="async"
				class={[
					'size-full rounded-2xl object-cover shadow-lg ring-1 ring-black/5',
					tile,
					i === 1 && 'rounded-tr-[2rem]'
				]}
			/>
		{/each}
	</div>
{/if}
