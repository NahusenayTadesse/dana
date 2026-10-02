<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { ArrowRight } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import { siteImages } from '$lib/siteImages.svelte';
	import { showcaseSrcset, SHOWCASE_PHOTOS } from '$lib/showcaseGallery';

	// Eight photos, no captions: a taste of the range, with the full filterable
	// gallery one click away on the factory page.
	const photos = $derived(siteImages('home.showcase.grid').slice(0, 8));

	// Tile 1 is the big square, tile 6 a wide one; the last two only show from
	// md up (hidden + lazy = never downloaded on phones).
	const tiles = [
		'col-span-2 row-span-2',
		'',
		'',
		'',
		'',
		'col-span-2',
		'hidden md:block',
		'hidden md:block'
	];
</script>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 py-16 md:px-8">
	<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
		<div class="max-w-[620px]">
			<p class="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">
				{m.showcase_gallery_eyebrow()}
			</p>
			<h2
				class="mt-3.5 font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-balance text-foreground"
			>
				{m.showcase_gallery_title()}
			</h2>
			<p class="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">
				{m.home_showcase_intro()}
			</p>
		</div>
		<a
			href="{resolve('/factory')}#project-gallery"
			class="group inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-border bg-card px-6 py-3 text-[14.5px] font-bold text-foreground transition duration-300 hover:-translate-y-0.5 hover:border-brand/40 md:self-auto"
		>
			{m.home_showcase_view_all({ count: SHOWCASE_PHOTOS.length })}
			<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
		</a>
	</div>

	<div
		class="mt-10 grid auto-rows-[130px] grid-cols-2 gap-3 md:auto-rows-[170px] md:grid-cols-4 md:gap-4"
		aria-hidden="true"
	>
		{#each photos as src, i (i)}
			<div class={['overflow-hidden rounded-2xl bg-muted ring-1 ring-border', tiles[i]]}>
				<img
					{src}
					srcset={showcaseSrcset(src)}
					sizes={i === 0 ? '(min-width: 768px) 620px, 100vw' : '(min-width: 768px) 300px, 50vw'}
					alt=""
					loading="lazy"
					decoding="async"
					class="size-full object-cover transition-transform duration-700 hover:scale-[1.05]"
				/>
			</div>
		{/each}
	</div>
</section>
