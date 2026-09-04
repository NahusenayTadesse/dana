<script lang="ts">
	import { ArrowRight } from '@lucide/svelte';
	import { siteSettingText } from '$lib/siteSettings.svelte';

	let { contactUrl = '/contact-us' } = $props();

	// Wording comes from dashboard/page-text, per language.
	const heading = $derived(siteSettingText('cta_heading'));
	const body = $derived(siteSettingText('cta_body'));
	const button = $derived(siteSettingText('cta_button'));
</script>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 pt-10 pb-20 md:px-8">
	<div
		class="relative overflow-hidden rounded-[2rem] bg-card px-8 py-16 text-center shadow-2xl shadow-brand/12 md:px-8"
	>
		<div
			class="pointer-events-none absolute -top-20 -right-16 size-80 rounded-full bg-[radial-gradient(circle,rgba(44,111,214,.16),transparent_68%)]"
		></div>

		<div class="relative">
			<h2
				class="font-heading text-[clamp(1.875rem,3.4vw,2.875rem)] font-extrabold tracking-[-0.02em] text-balance text-foreground"
			>
				{heading}
			</h2>
			<p class="mx-auto mt-4 max-w-[52ch] text-[17px] leading-relaxed text-muted-foreground">
				{body}
			</p>

			<a
				href={contactUrl}
				class="group mt-8 inline-flex items-center gap-3.5 rounded-full bg-gradient-to-br from-brand-bright to-brand py-2.5 pr-2.5 pl-7 text-base font-bold text-white shadow-lg shadow-brand/30 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/40 active:translate-y-0"
			>
				{button}
				<span class="flex size-10 items-center justify-center rounded-full bg-white">
					<ArrowRight class="size-4.5 text-brand transition-transform group-hover:translate-x-0.5" />
				</span>
			</a>
		</div>
	</div>
</section>
