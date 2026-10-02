<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import Lightbox from '$lib/components/lightbox.svelte';
	import { Expand } from '@lucide/svelte';
	import {
		SHOWCASE_PHOTOS,
		SHOWCASE_SETS,
		type ShowcaseColor,
		type ShowcaseKind,
		type ShowcaseSet
	} from '$lib/showcaseGallery';

	// Enough to fill three or four columns twice over; the rest wait behind
	// the "show all" button so the homepage only lazy-loads a dozen thumbnails.
	const PREVIEW = 12;

	const colorNames: Record<ShowcaseColor, () => string> = {
		black: m.showcase_color_black,
		brown: m.showcase_color_brown,
		terracotta: m.showcase_color_terracotta,
		red: m.showcase_color_red,
		blue: m.showcase_color_blue,
		lightblue: m.showcase_color_lightblue,
		green: m.showcase_color_green,
		white: m.showcase_color_white
	};

	const setName = (set: ShowcaseSet) =>
		(set.kind === 'roof' ? m.showcase_kind_roof : m.showcase_kind_fence)({
			color: colorNames[set.color]()
		});

	const kinds: { value: 'all' | ShowcaseKind; label: () => string }[] = [
		{ value: 'all', label: m.showcase_filter_all },
		{ value: 'roof', label: m.showcase_filter_roof },
		{ value: 'fence', label: m.showcase_filter_fence }
	];

	let kind = $state<'all' | ShowcaseKind>('all');
	let slug = $state<string | null>(null);
	let expanded = $state(false);

	const sets = $derived(SHOWCASE_SETS.filter((set) => kind === 'all' || set.kind === kind));
	const filtered = $derived(
		SHOWCASE_PHOTOS.filter((photo) =>
			slug ? photo.slug === slug : kind === 'all' || photo.kind === kind
		)
	);
	const visible = $derived(expanded ? filtered : filtered.slice(0, PREVIEW));

	function pickKind(value: 'all' | ShowcaseKind) {
		kind = value;
		slug = null;
		expanded = false;
	}

	function pickSet(value: string) {
		slug = slug === value ? null : value;
		expanded = false;
	}

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);

	const openAt = (i: number) => {
		lightboxIndex = i;
		lightboxOpen = true;
	};
</script>

<section
	id="project-gallery"
	class="relative z-[2] mx-auto max-w-[1280px] scroll-mt-24 px-6 py-16 md:px-8"
>
	<div class="mx-auto max-w-[720px] text-center">
		<p class="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">
			{m.showcase_gallery_eyebrow()}
		</p>
		<h2
			class="mt-3.5 font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-balance text-foreground"
		>
			{m.showcase_gallery_title()}
		</h2>
		<p class="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">
			{m.showcase_gallery_intro()}
		</p>
	</div>

	<div
		class="mx-auto mt-9 flex w-fit gap-1 rounded-full bg-card p-1.5 shadow-lg ring-1 shadow-brand/8 ring-brand/5"
		role="group"
		aria-label={m.showcase_filter_label()}
	>
		{#each kinds as option (option.value)}
			<button
				type="button"
				onclick={() => pickKind(option.value)}
				aria-pressed={kind === option.value}
				class={[
					'rounded-full px-5 py-2 text-[14px] font-bold transition-colors duration-200',
					kind === option.value
						? 'bg-gradient-to-br from-brand-bright to-brand text-white shadow-md shadow-brand/30'
						: 'text-muted-foreground hover:text-foreground'
				]}
			>
				{option.label()}
			</button>
		{/each}
	</div>

	<!-- One swipeable row on phones; wraps and centres from sm up. -->
	<div
		class="-mx-6 mt-5 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:justify-center sm:overflow-visible sm:px-0"
		role="group"
		aria-label={m.showcase_colour_label()}
	>
		{#each sets as set (set.slug)}
			<button
				type="button"
				onclick={() => pickSet(set.slug)}
				aria-pressed={slug === set.slug}
				class={[
					'inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors duration-200',
					slug === set.slug
						? 'border-brand bg-brand/10 text-foreground'
						: 'border-border text-muted-foreground hover:border-brand/40 hover:text-foreground'
				]}
			>
				<span
					class="size-3 shrink-0 rounded-full ring-1 ring-black/15"
					style="background-color:{set.swatch}"
					aria-hidden="true"
				></span>
				{kind === 'all' ? setName(set) : colorNames[set.color]()}
			</button>
		{/each}
	</div>

	<!-- Columns rather than a grid, so portrait and landscape renders stack
	     without cropping. Width/height on each <img> reserve the space. -->
	<ul class="mt-10 columns-2 gap-3 md:columns-3 md:gap-4 lg:columns-4">
		{#each visible as photo, i (photo.large)}
			<li class="mb-3 break-inside-avoid md:mb-4">
				<button
					type="button"
					onclick={() => openAt(i)}
					class="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border transition-shadow duration-300 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
					aria-label={m.showcase_open({ name: setName(photo) })}
				>
					<img
						src={photo.small}
						srcset={photo.srcset}
						sizes="(min-width: 1280px) 300px, (min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
						width={photo.width}
						height={photo.height}
						alt={m.showcase_photo_alt({ name: setName(photo) })}
						loading="lazy"
						decoding="async"
						class="h-auto w-full transition-transform duration-500 group-hover:scale-[1.04]"
					/>
					<span
						class="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"
					></span>
					<span class="absolute bottom-3 left-3.5 flex items-center gap-2 text-left">
						<span
							class="size-2.5 shrink-0 rounded-full ring-2 ring-white/80"
							style="background-color:{photo.swatch}"
							aria-hidden="true"
						></span>
						<span class="text-[12.5px] font-bold text-white md:text-[13.5px]">
							{setName(photo)}
						</span>
					</span>
					<span
						class="absolute top-3 right-3 grid size-8 place-items-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
						aria-hidden="true"
					>
						<Expand class="size-3.5" />
					</span>
				</button>
			</li>
		{/each}
	</ul>

	{#if filtered.length > PREVIEW}
		<div class="mt-6 flex justify-center">
			<button
				type="button"
				onclick={() => (expanded = !expanded)}
				class="rounded-full border border-border bg-card px-6 py-3 text-[14.5px] font-bold text-foreground transition duration-300 hover:-translate-y-0.5 hover:border-brand/40"
			>
				{expanded ? m.showcase_show_less() : m.showcase_show_all({ count: filtered.length })}
			</button>
		</div>
	{/if}

	<Lightbox
		images={filtered.map((photo) => photo.large)}
		thumbnails={filtered.map((photo) => photo.small)}
		captions={filtered.map(setName)}
		title={m.showcase_gallery_eyebrow()}
		bind:isOpen={lightboxOpen}
		bind:currentIndex={lightboxIndex}
	/>
</section>
