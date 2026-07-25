<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	const items = [
		m.marquee_ppgi,
		m.marquee_gi_coils,
		m.marquee_corrugated,
		m.marquee_roof_tiles,
		m.marquee_ridge,
		m.marquee_purlins
	];
	// duplicated so the -50% translate loops seamlessly
	const loop = [...items, ...items, ...items, ...items];
</script>

<section class="relative z-[2] mt-14 overflow-hidden py-2">
	<div class="mx-auto mb-5 max-w-[1280px] px-6 text-center md:px-8">
		<p class="text-[12.5px] font-bold tracking-[0.18em] text-muted-foreground uppercase">
			{m.marquee_eyebrow()}
		</p>
	</div>

	<div
		class="relative [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]"
	>
		<div class="flex w-max gap-3.5 animate-ds-marquee hover:[animation-play-state:paused]">
			{#each loop as label, i (i)}
				<span
					class="rounded-full bg-card px-5.5 py-2.5 text-[15px] font-bold whitespace-nowrap text-brand shadow-md shadow-brand/10"
				>
					{label()}
				</span>
			{/each}
		</div>
	</div>
</section>
