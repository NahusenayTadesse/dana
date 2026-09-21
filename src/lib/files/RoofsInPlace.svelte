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
</script>

<!-- Sits straight under the factory hero, so the clips lead and the copy follows
     as a caption, the way the old drag-around panorama did. -->
<section class="relative z-[2] mx-auto max-w-[1600px] px-6 md:px-8">
	<!-- Both clips side by side; each player loads and plays only while it's on
	     screen, and caps its rendition to its own box, so two at once stay cheap. -->
	<div class="grid gap-6 lg:grid-cols-2">
		{#each clips as clip (clip.slug)}
			<figure class="flex flex-col gap-4">
				<HlsVideo
					src="/videos/{clip.slug}/master.m3u8"
					fallback="/videos/{clip.slug}.mp4"
					poster="/videos/{clip.slug}-poster.jpg"
					label={clip.title()}
					pan
				/>
				<figcaption class="flex items-start gap-3 px-1">
					<span
						class="mt-1.5 size-3.5 shrink-0 rounded-full ring-2 ring-white/70"
						style="background-color:{clip.swatch}"
						aria-hidden="true"
					></span>
					<span class="leading-tight">
						<span class="block text-[17px] font-extrabold text-foreground">{clip.title()}</span>
						<span class="mt-1 block text-[13.5px] font-semibold text-muted-foreground">
							{clip.sub()}
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
</section>
