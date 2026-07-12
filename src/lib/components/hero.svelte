<script lang="ts">
	import { MessageSquareCode, ArrowRight } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { onMount } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import * as m from '$lib/paraglide/messages.js';

	let heroImage = [
		'hero.webp',
		'hero (1).webp',
		'hero (2).webp',
		'hero (3).webp',
		'hero (4).webp',
		'gallery (1).webp',
		'gallery (2).webp',
		'gallery (3).webp',
		'gallery (4).webp',
		'gallery (5).webp',
		'gallery (6).webp'
	];

	let currentImage = $state(0);
	let touchStartX = $state(0);
	let touchStartY = $state(0);

	let autoSlide: ReturnType<typeof setInterval>;

	const motions = [
		{
			inX: -180,
			inY: 80,
			outX: 180,
			outY: -90,
			inRotate: -28,
			outRotate: 22
		},
		{
			inX: 180,
			inY: -70,
			outX: -160,
			outY: 100,
			inRotate: 26,
			outRotate: -24
		},
		{
			inX: 0,
			inY: 180,
			outX: 0,
			outY: -180,
			inRotate: 18,
			outRotate: -18
		},
		{
			inX: -120,
			inY: -140,
			outX: 150,
			outY: 150,
			inRotate: -35,
			outRotate: 28
		},
		{
			inX: 140,
			inY: 140,
			outX: -150,
			outY: -130,
			inRotate: 32,
			outRotate: -30
		}
	];

	function nextImage() {
		currentImage = (currentImage + 1) % heroImage.length;
	}

	function prevImage() {
		currentImage = (currentImage - 1 + heroImage.length) % heroImage.length;
	}

	function resetAutoSlide() {
		clearInterval(autoSlide);
		autoSlide = setInterval(nextImage, 5000);
	}

	function handleTouchStart(event: TouchEvent) {
		touchStartX = event.touches[0].clientX;
		touchStartY = event.touches[0].clientY;
	}

	function handleTouchEnd(event: TouchEvent) {
		const touchEndX = event.changedTouches[0].clientX;
		const touchEndY = event.changedTouches[0].clientY;

		const diffX = touchEndX - touchStartX;
		const diffY = touchEndY - touchStartY;

		if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
			if (diffX < 0) {
				nextImage();
			} else {
				prevImage();
			}

			resetAutoSlide();
		}
	}

	function heroIn(node: Element, { motion }: { motion: (typeof motions)[number] }) {
		return {
			duration: 850,
			easing: cubicOut,
			css: (t: number, u: number) => `
				opacity: ${t};
				transform:
					translate3d(${motion.inX * u}px, ${motion.inY * u}px, 0)
					rotate(${motion.inRotate * u}deg)
					scale(${0.72 + t * 0.28});
				filter: blur(${u * 14}px);
			`
		};
	}

	function heroOut(node: Element, { motion }: { motion: (typeof motions)[number] }) {
		return {
			duration: 650,
			easing: cubicOut,
			css: (t: number, u: number) => `
				opacity: ${t};
				transform:
					translate3d(${motion.outX * u}px, ${motion.outY * u}px, 0)
					rotate(${motion.outRotate * u}deg)
					scale(${0.85 + t * 0.15});
				filter: blur(${u * 12}px);
			`
		};
	}

	onMount(() => {
		currentImage = heroImage.length - 1;

		autoSlide = setInterval(nextImage, 5000);

		return () => clearInterval(autoSlide);
	});

	let { bestSelling, id }: { bestSelling: string; id: string | number } = $props();
</script>

<section
	class="hero flex min-h-screen w-full items-center justify-center bg-background p-4 font-sans text-foreground antialiased selection:bg-primary selection:text-primary-foreground md:p-8 lg:p-12"
>
	<div class="grid w-full max-w-7xl grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
		<div
			class="relative flex flex-col justify-between overflow-hidden rounded-[2rem] border border-primary/10 bg-card bg-[radial-gradient(#00b4ed_1px,transparent_1px)] [background-size:24px_24px] [background-position:center] p-8 text-card-foreground shadow-sm md:p-12 lg:col-span-7 lg:p-16"
		>
			<a
				href="/shop/single/{id}"
				class="mb-8 inline-flex w-fit items-center gap-2 self-start rounded-full border border-primary/20 bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-transform hover:scale-[1.02] md:text-sm"
			>
				<span class="h-2 w-2 animate-pulse rounded-full bg-primary"></span>
				{m.hero_quality_assured_products()}
			</a>

			<div class="max-w-2xl space-y-6">
				<h1
					class="text-4xl leading-[1.1] font-extrabold tracking-tight text-balance md:text-5xl lg:text-6xl"
				>
					{m.hero_heading_powering_your()}<br />
					<span class="text-primary">{m.hero_heading_digital_lifestyle()}</span><br />
					{m.hero_heading_trusted_technology()}
				</h1>

				<p class="max-w-xl text-sm leading-relaxed font-medium text-muted-foreground md:text-base">
					{m.hero_description()}
				</p>
			</div>

			<div class="mt-8 flex flex-wrap items-center gap-4 md:mt-12">
				<Button href="/shop" variant="default">
					{m.hero_shop_now()}
					<ArrowRight class="h-4 w-4" />
				</Button>

				<Button variant="outline">
					<MessageSquareCode class="h-4 w-4 opacity-70" />
					{m.hero_need_assistance()}
				</Button>
			</div>
		</div>
		<div
			class="relative h-[420px] w-full touch-pan-y overflow-hidden rounded-[2rem] bg-linear-to-br from-background via-primary to-secondary shadow-md sm:h-[520px] lg:col-span-5 lg:h-full"
			ontouchstart={handleTouchStart}
			ontouchend={handleTouchEnd}
			aria-label={m.hero_gallery_aria_label()}
			role="region"
		>
			<div
				class="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_20%,transparent,rgba(0,0,0,0.25))]"
			></div>

			<div
				class="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-background/20 blur-3xl"
			></div>
			<div
				class="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-primary/30 blur-3xl"
			></div>

			{#key currentImage}
				<div
					in:heroIn={{ motion: motions[currentImage % motions.length] }}
					out:heroOut={{ motion: motions[currentImage % motions.length] }}
					class="absolute inset-0 flex items-center justify-center"
				>
					<img
						src={heroImage[currentImage]}
						alt={m.hero_product_showcase_alt()}
						class="hero-device h-full w-full object-contain p-6 sm:p-8 lg:p-10"
						draggable="false"
					/>
				</div>
			{/key}

			<div class="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 gap-2">
				{#each heroImage as _, i}
					<button
						type="button"
						aria-label={m.hero_show_image({ number: i + 1 })}
						onclick={() => {
							currentImage = i;
							resetAutoSlide();
						}}
						class={`h-1.5 rounded-full transition-all duration-500 ${
							i === currentImage ? 'w-8 bg-background' : 'w-2 bg-background/40'
						}`}
					></button>
				{/each}
			</div>
		</div>
	</div>
</section>

<style>
	.hero-device {
		animation: device-float 5s ease-in-out infinite;
		filter: drop-shadow(0 30px 45px rgba(0, 0, 0, 0.35));
		transform-origin: center;
		user-select: none;
		-webkit-user-drag: none;
	}

	@keyframes device-float {
		0%,
		100% {
			transform: translateY(0) rotate(-1deg) scale(1);
		}
		50% {
			transform: translateY(-18px) rotate(1.5deg) scale(1.025);
		}
	}

	@media (max-width: 640px) {
		.hero-device {
			animation: device-float 4.5s ease-in-out infinite;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero-device {
			animation: none;
		}
	}
</style>
