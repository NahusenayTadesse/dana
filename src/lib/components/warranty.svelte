<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		ShieldCheckIcon,
		InfoIcon,
		WrenchIcon,
		RefreshCcwIcon,
		Building2Icon,
		ArrowRightIcon
	} from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	const supportServices = [
		{
			icon: InfoIcon,
			title: m.warranty_product_information_title,
			text: m.warranty_product_information_text
		},
		{
			icon: ShieldCheckIcon,
			title: m.warranty_assistance_title,
			text: m.warranty_assistance_text
		},
		{
			icon: WrenchIcon,
			title: m.warranty_technical_support_title,
			text: m.warranty_technical_support_text
		},
		{
			icon: RefreshCcwIcon,
			title: m.warranty_replacement_guidance_title,
			text: m.warranty_replacement_guidance_text
		},
		{
			icon: Building2Icon,
			title: m.warranty_corporate_support_title,
			text: m.warranty_corporate_support_text
		}
	];
</script>

<section class="relative overflow-hidden bg-background px-4 py-20 text-foreground sm:px-6 lg:px-8">
	<div
		class="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.08),transparent_34%)]"
	></div>

	<div
		class="absolute top-10 left-1/3 -z-10 h-80 w-80 animate-pulse rounded-full bg-primary/10 blur-3xl"
	></div>

	<div class="mx-auto max-w-6xl">
		<div transition:fly={{ y: 24, duration: 650 }} class="mb-12 flex flex-col gap-4 text-center">
			<div
				class="mx-auto inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase backdrop-blur-xl"
			>
				<ShieldCheckIcon class="size-4" />
				{m.warranty_badge()}
			</div>

			<h2 class="text-3xl font-black tracking-tight sm:text-5xl">{m.warranty_heading()}</h2>

			<p class="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
				{m.warranty_description()}
			</p>
		</div>

		<div class="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
			{#each supportServices as service, i}
				<div transition:fly={{ y: 24, duration: 600, delay: 100 + i * 80 }}>
					<Card
						class="group border-primary/10 bg-card/40 shadow-lg backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:bg-primary/5"
					>
						<CardContent class="p-6">
							<div
								class="mb-5 flex size-12 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary transition duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground"
							>
								<service.icon class="size-6" />
							</div>

							<h3 class="text-sm font-bold">{service.title()}</h3>

							<p class="mt-3 text-xs leading-relaxed text-muted-foreground">{service.text()}</p>
						</CardContent>
					</Card>
				</div>
			{/each}
		</div>

		<div
			transition:fly={{ y: 24, duration: 650, delay: 220 }}
			class="mt-12 overflow-hidden rounded-3xl border border-primary/10 bg-card/40 p-6 text-center shadow-xl backdrop-blur-2xl sm:p-8"
		>
			<div class="mx-auto flex max-w-2xl flex-col items-center gap-4">
				<div
					class="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
				>
					<HelpCircleIcon class="size-7" />
				</div>

				<h3 class="text-2xl font-black tracking-tight">{m.warranty_need_assistance_title()}</h3>

				<p class="text-sm leading-relaxed text-muted-foreground">
					{m.warranty_need_assistance_description()}
				</p>

				<Button href="/contact-us" size="lg" class="group mt-2 rounded-full">
					{m.warranty_contact_support()}
					<ArrowRightIcon class="ml-2 size-4 transition-transform group-hover:translate-x-1" />
				</Button>
			</div>
		</div>
	</div>
</section>
