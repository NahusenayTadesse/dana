<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { Play } from '@lucide/svelte';
	import { siteImage } from '$lib/siteImages.svelte';

	let { videoId = 'Pds8-d8su7s', poster = '' } = $props();

	// Falls back to the admin-managed slot when the caller doesn't override it.
	const cover = $derived(poster || siteImage('home.video.poster'));

	let playing = $state(false);
</script>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 py-16 md:px-8">
	<div class="mx-auto mb-10 max-w-[640px] text-center">
		<p class="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">
			{m.video_showcase_badge()}
		</p>
		<h2
			class="mt-3.5 font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-foreground"
		>
			{m.video_showcase_title()}
		</h2>
		<p class="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">
			{m.video_showcase_description()}
		</p>
	</div>

	<div
		class="relative aspect-video overflow-hidden rounded-[2rem] bg-[#0C1B34] shadow-2xl shadow-brand/20"
	>
		{#if playing}
			<iframe
				class="absolute inset-0 h-full w-full"
				src="https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&rel=0"
				title={m.video_showcase_title()}
				allow="autoplay; encrypted-media; picture-in-picture"
				allowfullscreen
			></iframe>
		{:else}
			<button
				type="button"
				class="group absolute inset-0 h-full w-full cursor-pointer bg-cover bg-center"
				style="background-image:url('{cover}')"
				onclick={() => (playing = true)}
				aria-label={m.video_showcase_play_label()}
			>
				<span class="absolute inset-0 bg-black/35 transition-colors group-hover:bg-black/45"></span>
				<span
					class="absolute top-1/2 left-1/2 flex size-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-xl transition-transform group-hover:scale-110"
				>
					<Play class="ml-1 size-7 fill-brand text-brand" />
				</span>
			</button>
		{/if}
	</div>
</section>
