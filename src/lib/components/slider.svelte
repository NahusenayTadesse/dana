<script lang="ts">
	import * as Carousel from '$lib/components/ui/carousel/index.js';
	import Autoplay from 'embla-carousel-autoplay';
	import * as m from '$lib/paraglide/messages.js';

	const plugin = Autoplay({ delay: 1000, stopOnInteraction: true });

	let { imagesList = [] }: { imagesList: (string | null)[] } = $props();
</script>

<section
	class="relative z-0 mx-auto max-w-full overflow-hidden border-t border-primary/10 bg-background bg-cover bg-center py-20 sm:py-24 lg:px-6"
>
	<div
		class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_bottom,hsl(var(--primary)/0.08),transparent_40%)]"
	></div>
	<div class="mx-auto lg:max-w-7xl">
		<div class="mb-16 flex max-w-3xl flex-col items-center gap-3 justify-self-center text-center md:mb-20">
			<span class="text-xs font-bold uppercase tracking-widest text-primary">
				{m.partners_badge()}
			</span>
			<h3 class="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
				{m.partners_heading_prefix()}
				<span class="text-primary">{m.partners_heading_highlight()}</span>
			</h3>
			<p class="mt-2 text-lg leading-relaxed text-muted-foreground md:text-xl">
				{m.partners_description()}
			</p>
		</div>

		<Carousel.Root
			class="justify-self-center lg:w-full"
			opts={{
				align: 'center',
				loop: true
			}}
			plugins={[plugin]}
			onmouseenter={plugin.stop}
			onmouseleave={plugin.reset}
		>
			<Carousel.Content>
				{#each imagesList as src (src)}
					<Carousel.Item class="basis-1/2 px-0 md:basis-1/3 lg:basis-1/5 lg:px-4">
						<div class="flex w-full items-center justify-center">
							<img
								src="/files/{src}"
								alt={m.partners_logo_alt()}
								loading="lazy"
								class="rounded-4xl object-cover transition-all duration-300 ease-in-out hover:scale-110"
							/>
						</div>
					</Carousel.Item>
				{/each}
			</Carousel.Content>
			<Carousel.Previous />
			<Carousel.Next />
		</Carousel.Root>
	</div>
</section>


