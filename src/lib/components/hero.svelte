<script lang="ts">
	import {
		Link2,
		ArrowRight,
		Play,
		ShieldCheck,
		Truck,
		Layers,
		Factory,
		Star,
		Check
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		quoteUrl = '/checkout',
		watchUrl = '/factory',
		heroVideoId = 'Pds8-d8su7s'
	} = $props();

	const stats = [
		{ icon: ShieldCheck, label: m.hero_stat_quality },
		{ icon: Truck, label: m.hero_stat_delivery },
		{ icon: Layers, label: m.hero_stat_profiles },
		{ icon: Factory, label: m.hero_stat_manufacturing }
	];
</script>

<style>
	/* Corrugated accent behind the image card — tied to --brand so it re-tints in dark */
	.ds-corrugate {
		background: repeating-linear-gradient(
			90deg,
			color-mix(in srgb, var(--brand) 14%, var(--background)) 0 10px,
			color-mix(in srgb, var(--brand) 6%, var(--background)) 10px 20px
		);
	}
	/* Dot texture on the blue image card (card is always deep blue, so white reads in both themes) */
	.ds-dots {
		background-image: radial-gradient(rgba(255, 255, 255, 0.9) 1.4px, transparent 1.4px);
		background-size: 22px 22px;
	}
</style>

<section class="relative z-[2] mx-auto w-full max-w-[1280px] px-6 pt-10 md:px-8">
	<div class="grid items-center gap-10 md:grid-cols-[1.05fr_1fr] md:gap-12">
		<!-- ============ LEFT ============ -->
		<div class="pb-4 md:pb-11">
			<!-- Badge -->
			<div
				class="inline-flex animate-ds-up items-center gap-2.5 rounded-full bg-card py-2 pr-4.5 pl-2 shadow-lg shadow-brand/10 ring-1 ring-brand/5 [animation-delay:50ms]"
			>
				<span class="flex size-8 items-center justify-center rounded-full bg-brand">
					<Link2 class="size-4 text-white" />
				</span>
				<span class="text-[13.5px] font-bold tracking-[0.01em] text-brand">
					{m.badge_text()}
				</span>
			</div>

			<!-- Heading (gradient highlight + rest) -->
			<h1
				class="mt-6 animate-ds-up font-heading text-[clamp(2.6rem,4.8vw,4.5rem)] leading-[1.02] font-extrabold tracking-[-0.025em] text-balance text-foreground [animation-delay:120ms]"
			>
				<span class="bg-gradient-to-br from-brand-bright to-brand-mid bg-clip-text text-transparent">
					{m.hero_title_highlight()}
				</span>
				{m.hero_title_rest()}
			</h1>

			<!-- Subtitle -->
			<p
				class="mt-6 max-w-[48ch] animate-ds-up text-[18.5px] leading-relaxed text-muted-foreground [animation-delay:200ms]"
			>
				{m.hero_subtitle()}
			</p>

			<!-- Buttons -->
			<div class="mt-9 flex animate-ds-up flex-wrap items-center gap-4 [animation-delay:280ms]">
				<a
					href={quoteUrl}
					class="group inline-flex items-center gap-3.5 rounded-full bg-gradient-to-br from-brand-bright to-brand py-2.5 pr-2.5 pl-7 text-base font-bold text-white shadow-lg shadow-brand/30 transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/40 active:translate-y-0"
				>
					{m.btn_quote()}
					<span class="flex size-10 items-center justify-center rounded-full bg-white">
						<ArrowRight
							class="size-4.5 text-brand transition-transform group-hover:translate-x-0.5"
						/>
					</span>
				</a>

				<a
					href={watchUrl}
					class="inline-flex items-center gap-2.5 rounded-full border border-brand/15 bg-card px-6 py-3.5 text-[15px] font-bold text-brand transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand/15 active:translate-y-0"
				>
					<span class="flex size-6 items-center justify-center rounded-full bg-brand-red">
						<Play class="size-2.5 fill-white text-white" />
					</span>
					{m.hero_btn_watch()}
				</a>
			</div>

			<!-- Trust row -->
			<div class="mt-9 flex animate-ds-up items-center gap-4 [animation-delay:360ms]">
				<div class="flex">
					<div class="size-10 rounded-full bg-gradient-to-br from-brand-bright to-brand ring-[3px] ring-background"></div>
					<div class="-ml-3.5 size-10 rounded-full bg-gradient-to-br from-brand-red to-[#a51f18] ring-[3px] ring-background"></div>
					<div class="-ml-3.5 size-10 rounded-full bg-gradient-to-br from-brand to-brand-ink ring-[3px] ring-background"></div>
					<div class="-ml-3.5 size-10 rounded-full bg-gradient-to-br from-brand-green to-[#2f6e39] ring-[3px] ring-background"></div>
				</div>
				<div class="leading-tight">
					<div class="text-[15px] font-extrabold text-foreground">{m.hero_trust_count()}</div>
					<div class="text-[13.5px] font-semibold text-muted-foreground">{m.hero_trust_sub()}</div>
				</div>
			</div>

			<!-- Stats card -->
			<div
				class="mt-9 grid animate-ds-up grid-cols-2 gap-y-6 rounded-3xl bg-card px-5 py-7 shadow-2xl shadow-brand/15 sm:grid-cols-4 [animation-delay:400ms]"
			>
				{#each stats as stat (stat.label)}
					<div
						class="group flex flex-col items-center gap-3.5 px-4 text-center transition-transform duration-300 hover:-translate-y-1.5 sm:border-r sm:border-border/70 sm:last:border-r-0"
					>
						<span
							class="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-bright to-brand shadow-lg shadow-brand/30"
						>
							<stat.icon class="size-6.5 text-white" />
						</span>
						<span class="text-base font-bold text-foreground">{stat.label()}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- ============ RIGHT ============ -->
		<div class="relative animate-ds-in [animation-delay:150ms]">
			<!-- Corrugated accent behind -->
			<div
				class="ds-corrugate absolute top-10 -right-7 bottom-10 z-0 hidden w-[110px] rounded-3xl shadow-xl shadow-brand/10 md:block"
			></div>

			<!-- Image card -->
			<div
				class="relative z-[1] aspect-square overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-bright via-brand-mid to-brand shadow-2xl shadow-brand/40"
			>
				<div class="ds-dots absolute inset-0 opacity-[0.16]"></div>

				<div
					class="absolute inset-x-0 top-[6%] bottom-0 overflow-hidden [mask-image:linear-gradient(180deg,transparent_0%,#000_12%,#000_100%)]"
				>
					<iframe
						class="pointer-events-none absolute top-1/2 left-1/2 h-full w-[177.78%] -translate-x-1/2 -translate-y-1/2"
						src="https://www.youtube-nocookie.com/embed/{heroVideoId}?autoplay=1&mute=1&loop=1&playlist={heroVideoId}&controls=0&showinfo=0&modestbranding=1&playsinline=1&rel=0"
						title="Hero background video"
						allow="autoplay; encrypted-media"
						loading="lazy"
						aria-hidden="true"
						tabindex="-1"
					></iframe>
				</div>

				<div
					class="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,58,130,.34)_0%,rgba(18,58,130,0)_28%,rgba(12,27,52,.34)_100%)]"
				></div>

				<!-- Rating chip -->
				<div
					class="absolute top-5.5 right-5.5 animate-ds-float rounded-2xl bg-card/95 px-4 py-3 shadow-xl backdrop-blur"
				>
					<div class="flex items-center gap-2">
						<div class="flex gap-0.5">
							{#each Array(5) as _}
								<Star class="size-3.5 fill-brand-gold text-brand-gold" />
							{/each}
						</div>
						<span class="text-[15px] font-extrabold text-foreground">{m.hero_rating_value()}</span>
					</div>
					<div class="mt-0.5 text-[11.5px] font-semibold text-muted-foreground">
						{m.hero_rating_label()}
					</div>
				</div>

				<!-- RAL chip -->
				<div
					class="absolute bottom-5.5 left-5.5 animate-ds-float-b rounded-2xl bg-card/95 px-4.5 py-3.5 shadow-xl backdrop-blur"
				>
					<div class="font-grotesk text-[22px] leading-none font-extrabold text-brand">
						{m.hero_ral_title()}
					</div>
					<div class="mt-1 text-[12.5px] font-semibold text-muted-foreground">
						{m.hero_ral_sub()}
					</div>
				</div>

				<!-- Delivered chip -->
				<div
					class="absolute right-5.5 bottom-5.5 flex animate-ds-float items-center gap-2.5 rounded-xl bg-brand-red px-3.5 py-2.5 text-white shadow-lg shadow-brand-red/40"
				>
					<Check class="size-4.5" stroke-width={2.4} />
					<div class="leading-tight">
						<div class="text-sm font-extrabold">{m.hero_delivered_title()}</div>
						<div class="text-[11px] font-semibold opacity-85">{m.hero_delivered_sub()}</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>