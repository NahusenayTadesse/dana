<script lang="ts">
	import { ArrowRight, CalendarDays, MapPin, Layers } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { siteImage } from '$lib/siteImages.svelte';

	let {
		image = '',
		secondaryImage = '',
		productsUrl = '/shop',
		factoryUrl = '/factory'
	} = $props();

	// Admin-managed by default; an explicit prop still wins.
	const primary = $derived(image || siteImage('home.about.primary'));
	const secondary = $derived(secondaryImage || siteImage('home.about.secondary'));

	const facts = [
		{
			icon: CalendarDays,
			label: m.about_us_established_label,
			value: m.about_us_established_value
		},
		{ icon: MapPin, label: m.about_us_location_label, value: m.about_us_location_value },
		{ icon: Layers, label: m.about_us_lines_label, value: m.about_us_lines_value }
	];
</script>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 py-16 md:px-8">
	<div class="grid items-center gap-12 md:grid-cols-[1fr_0.95fr]">
		<!-- ============ COPY ============ -->
		<div>
			<p class="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">
				{m.about_us_eyebrow()}
			</p>

			<h2
				class="mt-3.5 font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-balance text-foreground"
			>
				{m.about_us_title()}
			</h2>

			<div class="mt-5 space-y-4 text-[16.5px] leading-relaxed text-muted-foreground">
				<p>{m.about_us_p1()}</p>
				<p>{m.about_us_p2()}</p>
				<p>{m.about_us_p3()}</p>
			</div>

			<div class="mt-8 flex flex-wrap items-center gap-4">
				<a
					href={productsUrl}
					class="group inline-flex items-center gap-3.5 rounded-full bg-gradient-to-br from-brand-bright to-brand py-2.5 pr-2.5 pl-7 text-base font-bold text-white shadow-lg shadow-brand/30 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/40 active:translate-y-0"
				>
					{m.about_us_cta_products()}
					<span class="flex size-10 items-center justify-center rounded-full bg-white">
						<ArrowRight
							class="size-4.5 text-brand transition-transform group-hover:translate-x-0.5"
						/>
					</span>
				</a>

				<a
					href={factoryUrl}
					class="inline-flex items-center gap-2.5 rounded-full border border-brand/15 bg-card px-6 py-3.5 text-[15px] font-bold text-brand transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/15 active:translate-y-0"
				>
					{m.about_us_cta_factory()}
				</a>
			</div>
		</div>

		<!-- ============ VISUALS ============ -->
		<div class="grid gap-4">
			<div class="overflow-hidden rounded-[2rem] shadow-2xl shadow-brand/20">
				<img
					src={primary}
					alt={m.about_us_img_alt()}
					class="aspect-[4/3] w-full object-cover"
					loading="lazy"
				/>
			</div>

			<div class="grid gap-4 sm:grid-cols-[1fr_1.1fr]">
				<div class="overflow-hidden rounded-3xl shadow-xl shadow-brand/10">
					<img
						src={secondary}
						alt={m.about_us_img_alt()}
						class="h-full min-h-[150px] w-full object-cover"
						loading="lazy"
					/>
				</div>

				<div
					class="flex flex-col justify-center gap-4 rounded-3xl bg-card p-5 shadow-xl shadow-brand/10"
				>
					{#each facts as fact (fact.label)}
						<div class="flex items-start gap-3">
							<span
								class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"
							>
								<fact.icon class="size-4" />
							</span>
							<div class="leading-tight">
								<div
									class="text-[11.5px] font-bold tracking-[0.1em] text-muted-foreground uppercase"
								>
									{fact.label()}
								</div>
								<div class="mt-1 text-[14.5px] font-extrabold text-foreground">{fact.value()}</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</section>
