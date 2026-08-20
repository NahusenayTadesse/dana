<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import * as m from '$lib/paraglide/messages.js';

	// Every image file actually present in /static/assets — keep this list in sync
	// with the folder contents (SvelteKit can't glob the static dir at build time).
	const imageFiles = [
		'1.webp',
		'2.webp',
		'4.webp',
		'5.webp',
		'8.webp',
		'11.webp',
		'12.webp',
		'14.webp',
		'15.webp',
		'18.webp',
		'19.webp',
		'77.webp',
		'products show4.webp',
		'factory-gate.jpg',
		'forklift.jpg',
		'reception.jpg',
		'rollforming.jpg',
		'showroom.jpg',
		'slitting-line.jpg',
		'warehouse.jpg',
		'image1.jpg',
		'image2.jpg',
		'image5.jpg',
		'image7.jpg',
		'image8.jpg',
		'image9.jpg',
		'image10.jpg'
	];

	const images = imageFiles.map((file, i) => ({
		id: i + 1,
		src: encodeURI(`/assets/${file}`),
		title: m.team_gallery_image_title({ index: i + 1 }),
		subtitle: m.team_gallery_image_subtitle()
	}));

	// Svelte 5 Rune State for active lightbox
	let selectedIndex = $state<number | null>(null);

	function openLightbox(index: number) {
		selectedIndex = index;
	}

	function closeLightbox() {
		selectedIndex = null;
	}

	function nextImage(e?: Event) {
		e?.stopPropagation();
		if (selectedIndex !== null) {
			selectedIndex = (selectedIndex + 1) % images.length;
		}
	}

	function prevImage(e?: Event) {
		e?.stopPropagation();
		if (selectedIndex !== null) {
			selectedIndex = (selectedIndex - 1 + images.length) % images.length;
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (selectedIndex === null) return;
		if (event.key === 'Escape') closeLightbox();
		if (event.key === 'ArrowRight') nextImage();
		if (event.key === 'ArrowLeft') prevImage();
	}

	// Repeating bento rhythm — every 8 tiles has one big feature, one tall, one wide.
	function tileSpan(i: number) {
		switch (i % 8) {
			case 0:
				return 'sm:col-span-2 sm:row-span-2';
			case 3:
				return 'sm:row-span-2';
			case 5:
				return 'sm:col-span-2';
			default:
				return '';
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="mx-auto w-full max-w-9/10 px-6 py-16">
	<!-- Header -->
	<div class="mb-10 text-center">
		<span class="text-xs font-bold tracking-widest text-primary uppercase">
			{m.about_gallery_label()}
		</span>
		<h2 class="mt-3 text-3xl font-black tracking-tight sm:text-5xl">
			{m.about_gallery_title()}
		</h2>
		<p class="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
			{m.about_gallery_description()}
		</p>
	</div>

	<!-- Grid Gallery -->
	<div
		class="grid grid-flow-dense auto-rows-[140px] grid-cols-2 gap-4 sm:auto-rows-[160px] sm:grid-cols-3 md:auto-rows-[190px] md:grid-cols-4"
	>
		{#each images as image, i (image.id)}
			<div
				in:fly={{ y: 20, duration: 500, delay: i * 40, easing: cubicOut }}
				class="group relative cursor-pointer overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md transition-all duration-500 hover:-translate-y-1 hover:rotate-[-0.3deg] hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/20 {tileSpan(
					i
				)}"
				onclick={() => openLightbox(i)}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && openLightbox(i)}
			>
				<!-- Thumbnail Image -->
				<img
					src={image.src}
					alt={image.title}
					loading="lazy"
					class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
				/>

				<!-- Resting gradient so tiles read as a cohesive mosaic even without hover -->
				<div
					class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-transparent opacity-70 transition-opacity duration-500 group-hover:opacity-0"
				></div>

				<!-- Hover ring accent -->
				<div
					class="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-2 ring-primary/50 transition-opacity duration-300 ring-inset group-hover:opacity-100"
				></div>

				<!-- Hover Overlay Gradient -->
				<div
					class="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/25 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
				>
					<span class="font-mono text-[10px] tracking-widest text-primary-foreground/70 uppercase">
						{String(image.id).padStart(2, '0')} / {images.length}
					</span>
					<h3
						class="translate-y-2 text-sm font-bold text-white transition-transform duration-300 group-hover:translate-y-0"
					>
						{image.title}
					</h3>
					<p
						class="translate-y-2 text-[11px] text-gray-300 transition-transform delay-75 duration-300 group-hover:translate-y-0"
					>
						{image.subtitle}
					</p>
				</div>

				<!-- Glass Badge in Corner -->
				<div
					class="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-card/60 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-110 group-hover:opacity-100"
				>
					<svg
						class="h-4 w-4 text-white"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M15 3h6v6M14 10l6-6M9 21H3v-6M10 14l-6 6" />
					</svg>
				</div>
			</div>
		{/each}
	</div>

	<!-- Lightbox Modal -->
	{#if selectedIndex !== null}
		<!-- Backdrop -->
		<div
			in:fade={{ duration: 250 }}
			out:fade={{ duration: 200 }}
			class="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xl sm:p-8"
		>
			<!-- Click-outside-to-close as a real button behind the card: a click
           handler on the backdrop div was unreachable by keyboard, and it
           forced the card to carry a stopPropagation handler of its own. -->
			<button
				type="button"
				class="absolute inset-0 z-0 cursor-default"
				onclick={closeLightbox}
				aria-label={m.lightbox_close()}
			></button>

			<!-- Modal Card -->
			<div
				in:scale={{ start: 0.93, duration: 300, easing: cubicOut }}
				out:scale={{ start: 0.95, duration: 200 }}
				class="relative z-10 flex max-h-[85vh] w-full max-w-5xl flex-col items-center justify-center outline-none"
				role="dialog"
				aria-modal="true"
				aria-label={m.lightbox_aria()}
				tabindex="-1"
			>
				<!-- Close Button -->
				<button
					onclick={closeLightbox}
					class="absolute -top-12 right-0 rounded-full p-2 text-white/70 transition-transform hover:scale-110 hover:text-white active:scale-95"
					aria-label={m.lightbox_close()}
				>
					<svg
						class="h-7 w-7"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg
					>
				</button>

				<!-- Main Displayed Image -->
				<div
					class="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-2xl"
				>
					<img
						src={images[selectedIndex].src}
						alt={images[selectedIndex].title}
						class="max-h-[75vh] w-auto max-w-full object-contain select-none"
					/>

					<!-- Floating Info Overlay inside Modal -->
					<div
						class="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5"
					>
						<div>
							<p class="font-mono text-xs text-primary-foreground/70 uppercase">
								{m.lightbox_counter({ current: selectedIndex + 1, total: images.length })}
							</p>
							<h3 class="text-xl font-bold text-white">
								{images[selectedIndex].title}
							</h3>
						</div>
					</div>
				</div>

				<!-- Navigation Buttons -->
				<button
					onclick={prevImage}
					class="absolute top-1/2 left-2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white/80 backdrop-blur-md transition-all hover:scale-110 hover:bg-black/90 hover:text-white active:scale-90 sm:-left-6"
					aria-label={m.lightbox_previous()}
				>
					<svg
						class="h-6 w-6"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
					>
				</button>

				<button
					onclick={nextImage}
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full border border-white/20 bg-black/60 p-3 text-white/80 backdrop-blur-md transition-all hover:scale-110 hover:bg-black/90 hover:text-white active:scale-90 sm:-right-6"
					aria-label={m.lightbox_next()}
				>
					<svg
						class="h-6 w-6"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
					>
				</button>
			</div>
		</div>
	{/if}
</section>
