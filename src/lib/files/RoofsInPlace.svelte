<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import HlsVideo from '$lib/components/hls-video.svelte';

	// Self-hosted clips of finished roofs. Each ships an adaptive HLS ladder
	// (1080/720/480) plus a flat MP4 for browsers without MSE or native HLS.
	const clips = [
		{
			slug: 'red-roof-aerial',
			title: m.roofs_clip_red_title,
			sub: m.roofs_clip_red_sub,
			swatch: '#B3312A'
		},
		{
			slug: 'charcoal-roof-villa',
			title: m.roofs_clip_charcoal_title,
			sub: m.roofs_clip_charcoal_sub,
			swatch: '#3A3733'
		}
	];

	let activeSlug = $state(clips[0].slug);
	const active = $derived(clips.find((c) => c.slug === activeSlug) ?? clips[0]);
</script>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 py-16 md:px-8">
	<div class="mx-auto mb-10 max-w-[640px] text-center">
		<p class="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">
			{m.roofs_in_place_badge()}
		</p>
		<h2
			class="mt-3.5 font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-foreground"
		>
			{m.roofs_in_place_title()}
		</h2>
		<p class="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">
			{m.roofs_in_place_description()}
		</p>
	</div>

	<div class="grid items-start gap-6 lg:grid-cols-[1fr_280px]">
		<!-- Remounting on slug change tears down the old stream before the next one
		     attaches, so only one clip is ever buffering. -->
		{#key active.slug}
			<HlsVideo
				src="/videos/{active.slug}/master.m3u8"
				fallback="/videos/{active.slug}.mp4"
				poster="/videos/{active.slug}-poster.jpg"
				label={active.title()}
			/>
		{/key}

		<!-- Clip picker: a row of cards on phones, a rail beside the player on desktop -->
		<div
			class="-mx-6 flex gap-4 overflow-x-auto px-6 pb-2 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
		>
			{#each clips as clip (clip.slug)}
				{@const selected = clip.slug === activeSlug}
				<button
					type="button"
					onclick={() => (activeSlug = clip.slug)}
					aria-pressed={selected}
					class="group flex w-[240px] shrink-0 cursor-pointer flex-col gap-3 rounded-[1.25rem] border p-3 text-left transition-all duration-300 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none lg:w-auto {selected
						? 'border-brand/30 bg-card shadow-xl shadow-brand/15'
						: 'border-border/70 bg-card/40 hover:-translate-y-0.5 hover:border-brand/20 hover:bg-card hover:shadow-lg'}"
				>
					<div class="relative aspect-video overflow-hidden rounded-[0.85rem] bg-brand-deep">
						<img
							src="/videos/{clip.slug}-poster.webp"
							alt=""
							loading="lazy"
							class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
						{#if selected}
							<span
								class="absolute inset-0 ring-2 ring-brand ring-inset"
								aria-hidden="true"
							></span>
						{/if}
					</div>

					<div class="flex items-start gap-2.5 px-0.5">
						<span
							class="mt-1 size-3 shrink-0 rounded-full ring-2 ring-white/70"
							style="background-color:{clip.swatch}"
							aria-hidden="true"
						></span>
						<span class="leading-tight">
							<span class="block text-[14.5px] font-extrabold text-foreground">
								{clip.title()}
							</span>
							<span class="mt-0.5 block text-[12.5px] font-semibold text-muted-foreground">
								{clip.sub()}
							</span>
						</span>
					</div>
				</button>
			{/each}
		</div>
	</div>
</section>
