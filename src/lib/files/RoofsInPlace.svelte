<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import ProductViewer from '$lib/components/product-viewer.svelte';
	import Lightbox from '$lib/components/lightbox.svelte';
	import { Expand } from '@lucide/svelte';

	// The six branded clips from /static/videos. The drone orbit of the apartment
	// block doubles as a turntable the visitor can spin (its stills live in
	// spin/); the rest play as they were shot. All carry the same chrome, and all
	// are muted encodes, so none gets a sound button.
	const showcase = [
		{
			key: 'apartment-green',
			frameCount: 20,
			title: m.hero_clip_apartment_green,
			sub: m.showcase_orbit_sub,
			swatch: '#1F5F4B'
		},
		{
			key: 'villa-green',
			title: m.hero_clip_villa_green,
			sub: m.showcase_villa_sub,
			swatch: '#2C6B58'
		},
		{
			key: 'villa-red',
			title: m.hero_clip_villa_red,
			sub: m.showcase_red_sub,
			swatch: '#B3312A'
		},
		{
			key: 'villa-charcoal',
			title: m.hero_clip_villa_charcoal,
			sub: m.showcase_charcoal_sub,
			swatch: '#3A3733'
		},
		{
			key: 'bungalow-green',
			title: m.hero_clip_bungalow_green,
			sub: m.showcase_bungalow_sub,
			swatch: '#1F5F4B'
		},
		{
			key: 'fence-grass',
			title: m.hero_clip_fence_grass,
			sub: m.showcase_fence_sub,
			swatch: '#3C8D3F'
		}
	].map((item) => ({
		frameCount: 0,
		...item,
		base: `/videos/${item.key}`,
		poster: `/videos/${item.key}/poster.jpg`
	}));

	// The colour range, each on a finished building rather than a swatch card.
	const finishes = [
		{
			key: 'terracotta',
			img: '/showcase/finish-terracotta.webp',
			name: m.finish_terracotta,
			swatch: '#B3312A'
		},
		{
			key: 'forest',
			img: '/showcase/finish-forest.webp',
			name: m.finish_forest,
			swatch: '#1F5F4B'
		},
		{
			key: 'graphite',
			img: '/showcase/finish-graphite.webp',
			name: m.finish_graphite,
			swatch: '#48566B'
		},
		{
			key: 'coffee',
			img: '/showcase/finish-coffee.webp',
			name: m.finish_coffee,
			swatch: '#4B372B'
		},
		{
			key: 'apartment',
			img: '/showcase/building-apartment.webp',
			name: m.finish_apartment,
			swatch: '#1F5F4B'
		},
		{
			key: 'factory',
			img: '/showcase/building-factory.webp',
			name: m.finish_factory,
			swatch: '#2C6B58'
		}
	];

	// The site's own lightbox handles the full-size views, arrows and thumbnails.
	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);

	const openAt = (i: number) => {
		lightboxIndex = i;
		lightboxOpen = true;
	};
</script>

<!-- Sits straight under the factory hero, so the buildings lead and the copy
     follows as a caption, the way the old drag-around panorama did. -->
<section class="relative z-[2] mx-auto max-w-[1600px] px-6 md:px-8">
	<div class="grid gap-8 md:grid-cols-2 2xl:grid-cols-3">
		{#each showcase as item (item.key)}
			<figure class="flex flex-col">
				<ProductViewer
					base={item.base}
					poster={item.poster}
					frameCount={item.frameCount}
					label={item.title()}
				/>
				<figcaption class="mt-4 flex items-start gap-3 px-1">
					<span
						class="mt-1.5 size-3.5 shrink-0 rounded-full ring-2 ring-white/70"
						style="background-color:{item.swatch}"
						aria-hidden="true"
					></span>
					<span class="leading-tight">
						<span class="block text-[17px] font-extrabold text-foreground">{item.title()}</span>
						<span class="mt-1 block text-[13.5px] font-semibold text-muted-foreground">
							{item.sub()}
						</span>
					</span>
				</figcaption>
			</figure>
		{/each}
	</div>

	<div class="mt-10 grid gap-4 md:grid-cols-[1fr_1.2fr] md:gap-12">
		<div>
			<p class="text-[12px] font-extrabold tracking-[0.26em] text-primary uppercase">
				{m.roofs_in_place_badge()}
			</p>
			<h2
				class="mt-3.5 font-heading text-[clamp(22px,2.4vw,32px)] leading-[1.12] font-extrabold tracking-[-0.02em] text-foreground"
			>
				{m.roofs_in_place_title()}
			</h2>
		</div>
		<p class="text-[15.5px] leading-[1.7] text-muted-foreground md:pt-7">
			{m.roofs_in_place_description()}
		</p>
	</div>

	<!-- The colour range, below the fold and lazily loaded. -->
	<div class="mt-12">
		<p class="mb-5 text-[12px] font-extrabold tracking-[0.26em] text-primary uppercase">
			{m.finishes_eyebrow()}
		</p>
		<ul class="grid grid-cols-2 gap-4 lg:grid-cols-3">
			{#each finishes as finish, i (finish.key)}
				<li
					class="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-300 hover:shadow-xl"
				>
					<button
						type="button"
						onclick={() => openAt(i)}
						class="block w-full cursor-zoom-in focus-visible:outline-none"
						aria-label={m.finish_open({ name: finish.name() })}
					>
						<img
							src={finish.img}
							alt={m.finish_photo_alt({ name: finish.name() })}
							loading="lazy"
							decoding="async"
							class="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
						/>
						<span
							class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"
						></span>
						<span
							class="pointer-events-none absolute inset-0 ring-primary/0 transition-all duration-300 ring-inset group-focus-within:ring-2 group-focus-within:ring-primary/70"
						></span>
						<span class="absolute bottom-3.5 left-4 flex items-center gap-2.5">
							<span
								class="size-3 shrink-0 rounded-full ring-2 ring-white/80"
								style="background-color:{finish.swatch}"
								aria-hidden="true"
							></span>
							<span class="text-[14px] font-extrabold text-white">{finish.name()}</span>
						</span>
						<span
							class="absolute top-3.5 right-3.5 grid size-9 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100"
							aria-hidden="true"
						>
							<Expand class="size-4" />
						</span>
					</button>
				</li>
			{/each}
		</ul>
	</div>

	<Lightbox
		images={finishes.map((f) => f.img)}
		captions={finishes.map((f) => f.name())}
		title={m.finishes_eyebrow()}
		bind:isOpen={lightboxOpen}
		bind:currentIndex={lightboxIndex}
	/>
</section>
