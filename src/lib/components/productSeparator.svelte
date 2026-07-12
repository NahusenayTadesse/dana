<!-- src/lib/components/GallerySeparator.svelte -->
<script lang="ts">
	const arrayMaker = () => {
		const length = 10;
		return Array.from({ length }, (_, i) => `product (${i + 1}).webp`);
	};

	const heroImages = arrayMaker();

	const galleryLoop = [...heroImages, ...heroImages, ...heroImages];
</script>

<div class="relative my-10 w-full overflow-hidden px-4 sm:px-6 lg:px-8">
	<div
		class="gallery-frame relative mx-auto h-36 w-full max-w-7xl overflow-hidden rounded-[2rem] border border-primary/15 bg-card shadow-sm lg:h-48"
	>
		<div
			class="pointer-events-none absolute inset-0 z-20 bg-linear-to-r from-background via-transparent to-background"
		></div>

		<div
			class="pointer-events-none absolute inset-y-0 left-0 z-30 w-20 bg-linear-to-r from-background to-transparent sm:w-32"
		></div>
		<div
			class="pointer-events-none absolute inset-y-0 right-0 z-30 w-20 bg-linear-to-l from-background to-transparent sm:w-32"
		></div>

		<div
			class="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_50%,transparent,rgba(0,0,0,0.2))]"
		></div>
		<div class="gallery-track flex h-full w-max items-center gap-3 px-0 sm:gap-4 sm:px-1">
			{#each galleryLoop as image, index}
				<div
					class="gallery-card relative h-28 shrink-0 overflow-hidden rounded-2xl border border-background/20 bg-background/20 shadow-sm sm:h-20 sm:w-36 lg:h-24 lg:h-48 lg:w-44"
				>
					<img
						src="/products/{image}"
						alt="Gallery separator"
						class="h-full w-full object-contain p-2"
						draggable="false"
					/>

					<div
						class="pointer-events-none absolute inset-0 bg-linear-to-br from-transparent via-transparent to-primary/20"
					></div>
				</div>
			{/each}
		</div>

		<div
			class="pointer-events-none absolute top-1/2 left-1/2 z-40 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-background/20 bg-background/20 px-4 py-1.5 backdrop-blur-md"
		>
			<span class="h-1.5 w-1.5 animate-pulse rounded-full bg-primary"></span>
			<span class="text-[10px] font-bold tracking-[0.3em] text-foreground/80 uppercase sm:text-xs">
				dana
			</span>
		</div>
	</div>
</div>

<style>
	.gallery-frame {
		isolation: isolate;
	}

	.gallery-frame::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 25;
		background-image:
			linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
			linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px);
		background-size: 24px 24px;
		mask-image: linear-gradient(90deg, transparent, black 20%, black 80%, transparent);
		pointer-events: none;
		opacity: 0.35;
	}

	.gallery-track {
		animation: gallery-slide 55s linear infinite;
	}

	.gallery-card {
		transform: rotate(-2deg);
		transition:
			transform 0.4s ease,
			opacity 0.4s ease;
	}

	.gallery-card:nth-child(even) {
		transform: rotate(2deg) translateY(4px);
	}

	.gallery-card:nth-child(3n) {
		transform: rotate(-1deg) translateY(-4px);
	}

	.gallery-frame:hover .gallery-track {
		animation-play-state: paused;
	}

	.gallery-frame:hover .gallery-card {
		opacity: 0.75;
	}

	.gallery-card:hover {
		z-index: 50;
		opacity: 1 !important;
		transform: rotate(0deg) scale(1.08) !important;
	}

	@keyframes gallery-slide {
		from {
			transform: translateX(0);
		}

		to {
			transform: translateX(-50%);
		}
	}

	@media (max-width: 640px) {
		.gallery-track {
			animation-duration: 18s;
		}

		.gallery-card:hover {
			transform: none !important;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-track {
			animation: none;
		}

		.gallery-card,
		.gallery-card:nth-child(even),
		.gallery-card:nth-child(3n) {
			transform: none;
		}
	}
</style>
