<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		TargetIcon,
		EyeIcon,
		ShieldCheckIcon,
		HandshakeIcon,
		SparklesIcon,
		HeartHandshakeIcon,
		AwardIcon
	} from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	const coreValues = [
		{
			icon: ShieldCheckIcon,
			title: m.mission_value_quality_title,
			text: m.mission_value_quality_text
		},
		{
			icon: HandshakeIcon,
			title: m.mission_value_integrity_title,
			text: m.mission_value_integrity_text
		},
		{
			icon: SparklesIcon,
			title: m.mission_value_innovation_title,
			text: m.mission_value_innovation_text
		},
		{
			icon: HeartHandshakeIcon,
			title: m.mission_value_customer_title,
			text: m.mission_value_customer_text
		},
		{
			icon: AwardIcon,
			title: m.mission_value_excellence_title,
			text: m.mission_value_excellence_text
		}
	];
</script>

<section class="relative overflow-hidden bg-background px-4 py-24 text-foreground sm:px-6 lg:px-8">
	<div
		class="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.08),transparent_36%)]"
	></div>
	<div
		class="absolute top-16 left-1/4 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="absolute right-1/4 bottom-10 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl"
	></div>

	<div class="mx-auto max-w-6xl">
		<div
			transition:fly={{ y: 24, duration: 650 }}
			class="mb-12 flex flex-col items-center gap-4 text-center"
		>
			<span
				class="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase backdrop-blur-xl"
			>
				{m.mission_badge()}
			</span>

			<h2 class="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
				{m.mission_heading()}
			</h2>

			<p class="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
				{m.mission_intro()}
			</p>
		</div>

		<div class="mb-8 grid gap-5 lg:grid-cols-2">
			<div transition:fly={{ y: 24, duration: 650, delay: 100 }}>
				<Card
					class="group overflow-hidden border-primary/10 bg-card/40 shadow-xl backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-primary/5"
				>
					<CardContent class="p-8">
						<div
							class="mb-6 flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary transition duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<TargetIcon class="size-7" />
						</div>

						<p class="text-xs font-bold tracking-widest text-primary uppercase">
							{m.mission_our_mission_label()}
						</p>

						<h3 class="mt-3 text-2xl font-black tracking-tight">{m.mission_our_mission_title()}</h3>

						<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
							{m.mission_our_mission_text()}
						</p>
					</CardContent>
				</Card>
			</div>
			<div transition:fly={{ y: 24, duration: 650, delay: 180 }}>
				<Card
					class="group overflow-hidden border-primary/10 bg-card/40 shadow-xl backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-primary/5"
				>
					<CardContent class="p-8">
						<div
							class="mb-6 flex size-14 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary transition duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<EyeIcon class="size-7" />
						</div>

						<p class="text-xs font-bold tracking-widest text-primary uppercase">
							{m.mission_our_vision_label()}
						</p>

						<h3 class="mt-3 text-2xl font-black tracking-tight">
							{m.mission_our_vision_title()}
						</h3>

						<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
							{m.mission_our_vision_text()}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>

		<div
			transition:fly={{ y: 24, duration: 650, delay: 240 }}
			class="rounded-3xl border border-primary/10 bg-card/40 p-6 shadow-xl backdrop-blur-2xl sm:p-8"
		>
			<div class="mb-8 text-center">
				<p class="text-xs font-bold tracking-widest text-primary uppercase">
					{m.mission_core_values_label()}
				</p>
				<h3 class="mt-3 text-3xl font-black tracking-tight">{m.mission_core_values_title()}</h3>
			</div>

			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
				{#each coreValues as value, i}
					<div
						transition:fly={{ y: 20, duration: 600, delay: 300 + i * 70 }}
						class="group rounded-2xl border border-primary/10 bg-background/50 p-5 text-center transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-primary/5"
					>
						<div
							class="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
						>
							<value.icon class="size-6" />
						</div>

						<h4 class="text-sm font-bold">{value.title()}</h4>

						<p class="mt-2 text-xs leading-relaxed text-muted-foreground">{value.text()}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
