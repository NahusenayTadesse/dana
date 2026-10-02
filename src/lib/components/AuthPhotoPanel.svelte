<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { siteImage } from '$lib/siteImages.svelte';
	import { showcaseSrcset } from '$lib/showcaseGallery';

	const photo = $derived(siteImage('pages.auth.panel'));
</script>

<!-- Large screens only. The lazy <img> inside a display:none box is never
     fetched, so phones skip the download entirely. -->
<figure
	class="relative isolate hidden h-[min(680px,calc(100dvh-8rem))] overflow-hidden rounded-[2rem] bg-[#0C1B34] shadow-2xl shadow-brand/15 lg:block"
>
	{#if photo}
		<img
			src={photo}
			srcset={showcaseSrcset(photo)}
			sizes="(min-width: 1280px) 560px, 45vw"
			alt=""
			loading="lazy"
			decoding="async"
			class="absolute inset-0 -z-10 size-full object-cover"
		/>
	{/if}
	<div
		class="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(12,27,52,0)_35%,rgba(12,27,52,.88)_100%)]"
	></div>

	<figcaption class="absolute inset-x-0 bottom-0 p-10 text-white">
		<p class="text-[12px] font-extrabold tracking-[0.2em] text-[#9DBBFF] uppercase">
			{m.brand_name()}
		</p>
		<p
			class="mt-3 font-heading text-[clamp(1.6rem,2.4vw,2.25rem)] leading-[1.1] font-extrabold tracking-[-0.02em] text-balance"
		>
			{m.auth_panel_title()}
		</p>
		<p class="mt-3 max-w-[42ch] text-[15.5px] leading-relaxed text-[#D6E2F5]">
			{m.auth_panel_text()}
		</p>
	</figcaption>
</figure>
