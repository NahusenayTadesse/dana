<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion';
	import {
		TruckIcon,
		PackageIcon,
		ShieldCheckIcon,
		HelpCircleIcon,
		CoinsIcon,
		RulerIcon,
		WrenchIcon,
		LayersIcon,
		FileTextIcon,
		FactoryIcon
	} from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';
	import { DEFAULT_FAQ, faqText, type FaqEntry, type FaqIconName } from '$lib/faqItems';

	// The list comes from dashboard/faq via the root layout. It used to be a
	// fixed nine-entry array here, so a tenth question meant two new translation
	// keys and a deploy.
	const entries = $derived((page.data?.faq as FaqEntry[] | undefined) ?? DEFAULT_FAQ);

	const icons: Record<FaqIconName, typeof ShieldCheckIcon> = {
		shield: ShieldCheckIcon,
		package: PackageIcon,
		ruler: RulerIcon,
		wrench: WrenchIcon,
		layers: LayersIcon,
		coins: CoinsIcon,
		truck: TruckIcon,
		file: FileTextIcon,
		factory: FactoryIcon,
		help: HelpCircleIcon
	};

	const features = $derived(
		entries.map((entry, index) => {
			const { question, answer } = faqText(entry, getLocale());
			return {
				id: `faq-${index}`,
				title: question,
				description: answer,
				icon: icons[entry.icon] ?? HelpCircleIcon
			};
		})
	);
</script>

<div
	class="relative min-h-dvh overflow-hidden bg-background px-4 py-24 text-foreground sm:px-6 lg:px-8"
>
	<div
		class="absolute top-12 left-1/3 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="absolute right-1/3 bottom-12 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/5 blur-3xl"
	></div>

	<div class="mx-auto max-w-6xl">
		<div
			transition:fly={{ y: 30, duration: 700 }}
			class="mb-16 flex flex-col items-center gap-3 text-center"
		>
			<span
				class="rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-[11px] font-bold tracking-widest text-primary uppercase backdrop-blur-xl"
			>
				{m.faq_customer_support_badge()}
			</span>

			<h1
				class="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
			>
				{m.faq_heading()}
			</h1>

			<p class="max-w-xl text-base text-muted-foreground">
				{m.faq_description()}
			</p>
		</div>

		<div transition:fly={{ y: 30, duration: 700, delay: 150 }}>
			<Accordion type="single" collapsible class="grid w-full items-start gap-4 md:grid-cols-2">
				{#each features as feature (feature.id)}
					<AccordionItem
						value={feature.id}
						class="group overflow-hidden rounded-2xl border border-primary/10 bg-card/30 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/25 hover:bg-card/50 [&[data-state=open]]:border-primary/30 [&[data-state=open]]:bg-primary/5 [&[data-state=open]]:shadow-lg"
					>
						<AccordionTrigger class="px-6 py-4 hover:no-underline">
							<div class="flex items-center gap-4 text-left">
								<div
									class="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/5 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/10 group-data-[state=open]:bg-primary group-data-[state=open]:text-primary-foreground"
								>
									<feature.icon class="size-5" />
								</div>

								<h3
									class="text-sm font-bold tracking-wide transition-colors duration-300 group-hover:text-primary group-data-[state=open]:text-primary"
								>
									{feature.title}
								</h3>
							</div>
						</AccordionTrigger>

						<AccordionContent
							class="border-t border-primary/10 bg-background/40 px-6 py-4 backdrop-blur-xl"
						>
							<p class="text-xs leading-relaxed text-muted-foreground">
								{feature.description}
							</p>
						</AccordionContent>
					</AccordionItem>
				{/each}
			</Accordion>
		</div>
	</div>
</div>
