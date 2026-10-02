<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { siteSettingText } from '$lib/siteSettings.svelte';
	import { siteImage } from '$lib/siteImages.svelte';
	import { showcaseSrcset } from '$lib/showcaseGallery';

	let { contactUrl = '/contact-us' } = $props();

	// Wording comes from dashboard/page-text, per language.
	const heading = $derived(siteSettingText('cta_heading'));
	const body = $derived(siteSettingText('cta_body'));
	const button = $derived(siteSettingText('cta_button'));

	const photo = $derived(siteImage('home.cta.background'));
</script>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 pt-10 pb-20 md:px-8">
	<div
		class="relative isolate overflow-hidden rounded-[2rem] bg-[#0C1B34] px-8 py-16 text-center shadow-2xl shadow-brand/12 md:px-8 md:py-20"
	>
		<!-- An <img> rather than a CSS background so it lazy-loads: this is the
		     last thing on the page and shouldn't compete with the hero. -->
		{#if photo}
			<img
				src={photo}
				srcset={showcaseSrcset(photo)}
				sizes="(min-width: 1280px) 1216px, 100vw"
				alt=""
				loading="lazy"
				decoding="async"
				class="absolute inset-0 -z-10 size-full object-cover"
			/>
		{/if}
		<!-- Fixed navy wash so the white copy reads in both themes -->
		<div
			class="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(12,27,52,.72)_0%,rgba(12,27,52,.86)_100%)]"
		></div>
		<div
			class="pointer-events-none absolute -top-20 -right-16 -z-10 size-80 rounded-full bg-[radial-gradient(circle,rgba(44,111,214,.3),transparent_68%)]"
		></div>

		<div class="relative">
			<h2
				class="font-heading text-[clamp(1.875rem,3.4vw,2.875rem)] font-extrabold tracking-[-0.02em] text-balance text-white"
			>
				{heading}
			</h2>
			<p class="mx-auto mt-4 max-w-[52ch] text-[17px] leading-relaxed text-[#D6E2F5]">
				{body}
			</p>

			<a
				href={contactUrl}
				class="group mt-8 inline-flex items-center gap-3.5 rounded-full bg-gradient-to-br from-brand-bright to-brand py-2.5 pr-2.5 pl-7 text-base font-bold text-white shadow-lg shadow-black/30 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 active:translate-y-0"
			>
				{button}
				<span class="flex size-10 items-center justify-center rounded-full bg-white">
					<ArrowRight class="size-4.5 text-brand transition-transform group-hover:translate-x-0.5" />
				</span>
			</a>
		</div>
	</div>
</section>
