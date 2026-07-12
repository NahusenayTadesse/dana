<script lang="ts">
	import { BookOpenIcon, BatteryChargingIcon, ZapIcon, ShieldCheckIcon } from '@lucide/svelte';
	import { fly, fade } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';
</script>

<section class="relative mb-10 overflow-hidden bg-background px-4 py-24 text-foreground sm:py-32">
	<div
		class="absolute top-0 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
	></div>
	<div class="absolute right-0 bottom-0 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl"></div>

	<div
		class="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:28px_28px]"
	></div>

	<div class="relative mx-auto max-w-5xl text-center">
		<div
			in:fly={{ y: 20, duration: 600 }}
			class="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold tracking-widest text-primary uppercase backdrop-blur-xl"
		>
			<BookOpenIcon class="size-4" />
			{m.portfolio_hero_badge()}
		</div>

		<h1
			in:fly={{ y: 24, duration: 700, delay: 100 }}
			class="mx-auto max-w-4xl text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl"
		>
			{m.portfolio_hero_title()}
		</h1>

		<p
			in:fade={{ duration: 700, delay: 220 }}
			class="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
		>
			{m.portfolio_hero_description()}
		</p>

		<div
			in:fly={{ y: 26, duration: 700, delay: 300 }}
			class="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-3"
		>
			<div class="rounded-2xl border border-primary/10 bg-card/40 p-5 backdrop-blur-2xl">
				<BatteryChargingIcon class="mx-auto mb-3 size-6 text-primary" />
				<p class="text-sm font-bold">{m.portfolio_hero_power_title()}</p>
				<p class="mt-1 text-xs text-muted-foreground">{m.portfolio_hero_power_description()}</p>
			</div>

			<div class="rounded-2xl border border-primary/10 bg-card/40 p-5 backdrop-blur-2xl">
				<ZapIcon class="mx-auto mb-3 size-6 text-primary" />
				<p class="text-sm font-bold">{m.portfolio_hero_accessories_title()}</p>
				<p class="mt-1 text-xs text-muted-foreground">
					{m.portfolio_hero_accessories_description()}
				</p>
			</div>

			<div class="rounded-2xl border border-primary/10 bg-card/40 p-5 backdrop-blur-2xl">
				<ShieldCheckIcon class="mx-auto mb-3 size-6 text-primary" />
				<p class="text-sm font-bold">{m.portfolio_hero_support_title()}</p>
				<p class="mt-1 text-xs text-muted-foreground">
					{m.portfolio_hero_support_description()}
				</p>
			</div>
		</div>
	</div>
</section>
