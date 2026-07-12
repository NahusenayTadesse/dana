<script lang="ts">
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

	import {
		BatteryChargingIcon,
		ZapIcon,
		ShieldCheckIcon,
		UsbIcon,
		MonitorIcon,
		CableIcon
	} from '@lucide/svelte';

	import { fly, scale } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	const features = [
		{
			icon: ShieldCheckIcon,
			label: m.about_feature_quality_label,
			description: m.about_feature_quality_description
		},
		{
			icon: ZapIcon,
			label: m.about_feature_pricing_label,
			description: m.about_feature_pricing_description
		},
		{
			icon: UsbIcon,
			label: m.about_feature_support_label,
			description: m.about_feature_support_description
		},
		{
			icon: MonitorIcon,
			label: m.about_feature_availability_label,
			description: m.about_feature_availability_description
		}
	];

	const galleryImages = [
		{
			image: '/gallery (1).webp',
			alt: m.about_gallery_lifestyle_alt
		},
		{
			image: '/gallery (2).webp',
			alt: m.about_gallery_mobile_alt
		},
		{
			image: '/gallery (3).webp',
			alt: m.about_gallery_packaging_alt
		},
		{
			image: '/gallery (4).webp',
			alt: m.about_gallery_smart_accessories_alt
		}
	];

	const productPillars = [
		{
			icon: BatteryChargingIcon,
			title: m.about_pillar_power_title,
			copy: m.about_pillar_power_copy
		},
		{
			icon: ZapIcon,
			title: m.about_pillar_mobile_title,
			copy: m.about_pillar_mobile_copy
		},
		{
			icon: CableIcon,
			title: m.about_pillar_storage_title,
			copy: m.about_pillar_storage_copy
		}
	];
</script>

<section class="relative overflow-hidden bg-background px-4 py-24 text-foreground sm:px-6 lg:px-8">
	<div
		class="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.16),transparent_32%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.1),transparent_34%)]"
	></div>
	<div
		class="absolute top-0 left-1/4 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="absolute right-1/4 bottom-0 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl"
	></div>

	<div class="mx-auto max-w-6xl">
		<div transition:fly={{ y: 30, duration: 700 }} class="mb-16 text-center">
			<span
				class="mx-auto mb-4 inline-flex rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-xs font-semibold tracking-wider text-primary uppercase"
			>
				{m.about_badge_trusted_technology()}
			</span>

			<h2 class="text-4xl font-extrabold tracking-tight sm:text-6xl">
				{m.about_heading()}
			</h2>

			<p class="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
				{m.about_description()}
			</p>
		</div>

		<div class="mb-16 grid gap-8 lg:grid-cols-3">
			<div transition:fly={{ y: 30, duration: 700, delay: 120 }} class="lg:col-span-2">
				<Card
					class="group relative h-full overflow-hidden border-primary/10 bg-card/50 shadow-xl backdrop-blur-md"
				>
					<div
						class="absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--primary)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.05)_1px,transparent_1px)] bg-[size:24px_24px]"
					></div>

					<div
						class="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl transition duration-700 group-hover:scale-125 group-hover:bg-primary/20"
					></div>

					<CardContent class="grid h-full gap-8 p-8 md:grid-cols-5 md:items-center">
						<div class="md:col-span-3">
							<div class="mb-4 flex items-center gap-2 text-primary">
								<BatteryChargingIcon class="size-5" />
								<span class="text-xs font-bold tracking-widest uppercase">
									{m.about_product_categories_label()}
								</span>
							</div>

							<h3 class="text-3xl font-bold tracking-tight">
								{m.about_product_categories_title()}
							</h3>

							<p class="mt-4 text-sm leading-relaxed text-muted-foreground">
								{m.about_product_categories_description()}
							</p>

							<div class="mt-6 grid grid-cols-2 gap-3">
								<div class="rounded-xl border border-primary/10 bg-primary/5 p-4">
									<p class="text-xs text-muted-foreground">{m.about_product_range_label()}</p>
									<p class="text-2xl font-bold text-primary">5+</p>
								</div>

								<div class="rounded-xl border border-primary/10 bg-primary/5 p-4">
									<p class="text-xs text-muted-foreground">
										{m.about_customer_commitment_label()}
									</p>
									<p class="text-2xl font-bold text-primary">100%</p>
								</div>
							</div>
						</div>

						<div class="md:col-span-2">
							<div
								in:scale={{ duration: 600, delay: 250 }}
								class="relative overflow-hidden rounded-2xl border border-primary/10 bg-background/70 p-3 shadow-inner"
							>
								<img
									src="/hero.webp"
									alt={m.about_product_showcase_alt()}
									class="aspect-4/5 w-full rounded-xl object-cover transition duration-700 hover:scale-105"
								/>

								<div
									class="absolute right-5 bottom-5 left-5 rounded-xl border border-white/10 bg-background/80 p-4 shadow-xl backdrop-blur-md"
								>
									<div class="mb-2 flex items-center justify-between">
										<span class="font-mono text-[10px] text-muted-foreground">
											dana_ELECTRONICS
										</span>
										<span
											class="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary"
										>
											{m.about_trusted_badge()}
										</span>
									</div>

									<div class="mb-3">
										<div class="mb-1 flex justify-between text-xs">
											<span class="text-muted-foreground">{m.about_quality_assurance_label()}</span>
											<span class="font-mono text-primary">{m.about_verified_label()}</span>
										</div>
										<div class="h-2 rounded-full bg-primary/10">
											<div class="h-2 w-4/5 rounded-full bg-primary"></div>
										</div>
									</div>

									<div class="flex items-center gap-2">
										<CableIcon class="size-4 text-primary" />
										<span class="text-xs font-semibold">
											{m.about_product_types_label()}
										</span>
									</div>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			<div class="flex flex-col gap-4">
				{#each features as feature, i}
					<div transition:fly={{ y: 20, duration: 600, delay: 180 + i * 90 }}>
						<Card
							class="group border-primary/10 bg-card/40 backdrop-blur-md transition duration-500 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
						>
							<CardContent class="flex gap-4 pt-6">
								<div
									class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary transition duration-500 group-hover:scale-110 group-hover:bg-primary/10"
								>
									<svelte:component this={feature.icon} class="size-6" />
								</div>

								<div>
									<p class="text-sm font-semibold">{feature.label()}</p>
									<p class="mt-1 text-xs leading-relaxed text-muted-foreground">
										{feature.description()}
									</p>
								</div>
							</CardContent>
						</Card>
					</div>
				{/each}
			</div>
		</div>

		<div class="mb-16">
			<div
				transition:fly={{ y: 24, duration: 700 }}
				class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
			>
				<div>
					<p class="text-xs font-bold tracking-widest text-primary uppercase">
						{m.about_featured_categories_label()}
					</p>
					<h3 class="mt-2 text-3xl font-bold tracking-tight">
						{m.about_explore_product_range_title()}
					</h3>
				</div>

				<p class="max-w-xl text-sm leading-relaxed text-muted-foreground">
					{m.about_featured_categories_description()}
				</p>
			</div>

			<div class="mb-16">
				<div
					transition:fly={{ y: 24, duration: 700 }}
					class="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between"
				>
					<div>
						<p class="text-xs font-bold tracking-widest text-primary uppercase">
							{m.about_gallery_label()}
						</p>

						<h3 class="mt-2 text-3xl font-bold tracking-tight">
							{m.about_gallery_title()}
						</h3>
					</div>

					<p class="max-w-xl text-sm leading-relaxed text-muted-foreground">
						{m.about_gallery_description()}
					</p>
				</div>

				<div class="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
					{#each galleryImages as item, i}
						<div transition:fly={{ y: 36, duration: 700, delay: 120 + i * 100 }}>
							<div
								class="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card/40 shadow-xl backdrop-blur-md transition duration-500 hover:-translate-y-2 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10"
							>
								<img
									src={item.image}
									alt={item.alt()}
									class="aspect-[4/5] w-full object-cover transition duration-700 group-hover:scale-110"
								/>

								<div
									class="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent opacity-70 transition duration-500 group-hover:opacity-40"
								></div>

								<div
									class="absolute inset-x-4 bottom-4 translate-y-3 rounded-2xl border border-white/10 bg-background/70 p-4 opacity-0 backdrop-blur-md transition duration-500 group-hover:translate-y-0 group-hover:opacity-100"
								>
									<p class="text-xs font-semibold tracking-widest text-primary uppercase">
										{m.about_gallery_brand()}
									</p>

									<p class="mt-1 text-sm font-bold">
										{m.about_gallery_card_caption()}
									</p>
								</div>

								<div
									class="absolute top-4 right-4 size-10 rounded-full border border-white/10 bg-background/60 backdrop-blur-md transition duration-500 group-hover:scale-110 group-hover:bg-primary/10"
								></div>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<Card class="overflow-hidden border-primary/10 bg-card/30 shadow-xl backdrop-blur-lg">
				<CardHeader>
					<CardTitle>{m.about_why_choose_title()}</CardTitle>
					<CardDescription>
						{m.about_why_choose_description()}
					</CardDescription>
				</CardHeader>

				<CardContent>
					<div class="grid gap-4 md:grid-cols-3">
						{#each productPillars as pillar, i}
							<div
								transition:fly={{ y: 24, duration: 650, delay: 120 + i * 90 }}
								class="group rounded-2xl border border-primary/10 bg-background/60 p-6 transition duration-500 hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5"
							>
								<svelte:component
									this={pillar.icon}
									class="mb-4 size-7 text-primary transition duration-500 group-hover:scale-110"
								/>

								<h4 class="text-sm font-bold">{pillar.title()}</h4>

								<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
									{pillar.copy()}
								</p>
							</div>
						{/each}
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</section>
