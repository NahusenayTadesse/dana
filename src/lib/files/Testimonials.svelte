<script lang="ts">
	import { fade } from 'svelte/transition';
	import { ChevronLeft, ChevronRight } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	type Testimonial = {
		id: number;
		name: string;
		position: string | null;
		message: string;
		avatar: string | null;
	};

	let { testimonials = [] as Testimonial[] } = $props();

	let index = $state(0);
	let paused = $state(false);

	const count = $derived(testimonials.length);
	const current = $derived(testimonials[index]);

	function go(i: number) {
		if (count === 0) return;
		index = ((i % count) + count) % count;
	}

	// Auto-advance (pauses on hover/focus, respects reduced motion)
	$effect(() => {
		if (count <= 1 || paused) return;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (reduce) return;
		const id = setInterval(() => (index = (index + 1) % count), 6000);
		return () => clearInterval(id);
	});

	function initial(name: string) {
		return name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
	}
</script>

{#if count > 0}
	<section class="relative z-[2] mx-auto max-w-[1280px] px-6 py-10 md:px-8">
		<div
			class="mx-auto max-w-[880px] text-center"
			onmouseenter={() => (paused = true)}
			onmouseleave={() => (paused = false)}
			onfocusin={() => (paused = true)}
			onfocusout={() => (paused = false)}
			role="group"
			aria-roledescription="carousel"
		>
			{#key current.id}
				<div in:fade={{ duration: 350 }}>
					<p
						class="text-[clamp(1.375rem,2.4vw,1.875rem)] leading-[1.4] font-bold tracking-[-0.01em] text-balance text-foreground"
					>
						&ldquo;{current.message}&rdquo;
					</p>

					<div class="mt-7 flex items-center justify-center gap-3.5">
						{#if current.avatar}
							<img
								src={`/files/${current.avatar}`}
								alt={current.name}
								class="size-12 rounded-full object-cover ring-2 ring-brand/10"
								loading="lazy"
							/>
						{:else}
							<div
								class="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-bright to-brand text-base font-extrabold text-white"
							>
								{initial(current.name)}
							</div>
						{/if}
						<div class="text-left">
							<div class="text-[15px] font-extrabold text-foreground">{current.name}</div>
							{#if current.position}
								<div class="text-[13.5px] font-semibold text-muted-foreground">
									{current.position}
								</div>
							{/if}
						</div>
					</div>
				</div>
			{/key}

			{#if count > 1}
				<div class="mt-7 flex items-center justify-center gap-4">
					<button
						type="button"
						onclick={() => go(index - 1)}
						aria-label={m.testimonials_aria_prev()}
						class="flex size-9 items-center justify-center rounded-full border border-brand/15 bg-card text-muted-foreground transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
					>
						<ChevronLeft class="size-4" />
					</button>

					<div class="flex items-center gap-2">
						{#each testimonials as t, i (t.id)}
							<button
								type="button"
								onclick={() => go(i)}
								aria-label={`${i + 1}`}
								aria-current={i === index}
								class="h-2 rounded-full transition-all {i === index
									? 'w-6 bg-brand'
									: 'w-2 bg-brand/25 hover:bg-brand/40'}"
							></button>
						{/each}
					</div>

					<button
						type="button"
						onclick={() => go(index + 1)}
						aria-label={m.testimonials_aria_next()}
						class="flex size-9 items-center justify-center rounded-full border border-brand/15 bg-card text-muted-foreground transition-colors hover:text-brand focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:outline-none"
					>
						<ChevronRight class="size-4" />
					</button>
				</div>
			{/if}
		</div>
	</section>
{/if}
