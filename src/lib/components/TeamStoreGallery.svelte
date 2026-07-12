<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import {
		ArrowRightIcon,
		BatteryChargingIcon,
		CameraIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		ImagesIcon,
		MapPinIcon,
		Maximize2Icon,
		ShieldCheckIcon,
		SparklesIcon,
		StoreIcon,
		UsersIcon,
		XIcon,
		ZapIcon
	} from '@lucide/svelte';
	import { fade, fly, scale } from 'svelte/transition';

	type GalleryType = 'team' | 'store' | 'details';
	type FilterKey = 'all' | GalleryType;

	const imageNotes: Record<GalleryType, string> = {
		team: 'Our Team',
		store: 'Store Gallery',
		details: 'Product Display'
	};

	const galleryImages = Array.from({ length: 25 }, (_, index) => {
		const number = index + 1;
		const type: GalleryType = number <= 6 ? 'team' : number <= 14 ? 'store' : 'details';

		return {
			number,
			type,
			src: `/images/t (${number}).webp`,
			alt: `${imageNotes[type]} photo ${number}`,
			title:
				type === 'team'
					? 'People Behind dana'
					: type === 'store'
						? 'dana Store Experience'
						: 'Chargers & Power Banks Display',
			detail:
				type === 'team'
					? 'Customer support, product guidance, and daily service.'
					: type === 'store'
						? 'A clear local shopping space for power banks, chargers, and accessories.'
						: 'Fast-charging electronics presented with clear model information.'
		};
	});

	const filters: { key: FilterKey; label: string; icon: any }[] = [
		{ key: 'all', label: 'All Photos', icon: ImagesIcon },
		{ key: 'team', label: 'Our Team', icon: UsersIcon },
		{ key: 'store', label: 'Store Gallery', icon: StoreIcon },
		{ key: 'details', label: 'Product Display', icon: BatteryChargingIcon }
	];

	const highlights = [
		{
			icon: UsersIcon,
			value: 'Team',
			label: 'Friendly guidance before and after purchase'
		},
		{
			icon: StoreIcon,
			value: 'Store',
			label: 'Local shopping experience in Addis Ababa'
		},
		{
			icon: ShieldCheckIcon,
			value: 'Trust',
			label: 'Power banks and chargers with support'
		}
	];

	let activeFilter = $state<FilterKey>('all');
	let selectedIndex = $state<number | null>(null);

	function shuffleArray(array) {
		for (let i = array.length - 1; i > 0; i--) {
			// Pick a random index from 0 to i
			const j = Math.floor(Math.random() * (i + 1));
			// Swap elements array[i] and array[j]
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	const filteredImages = $derived(galleryImages);

	const selectedImage = $derived(selectedIndex === null ? null : filteredImages[selectedIndex]);

	function openViewer(index: number) {
		selectedIndex = index;
	}

	function closeViewer() {
		selectedIndex = null;
	}

	function showNext() {
		if (selectedIndex === null || filteredImages.length === 0) return;
		selectedIndex = (selectedIndex + 1) % filteredImages.length;
	}

	function showPrevious() {
		if (selectedIndex === null || filteredImages.length === 0) return;
		selectedIndex = (selectedIndex - 1 + filteredImages.length) % filteredImages.length;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!selectedImage) return;

		if (event.key === 'Escape') closeViewer();
		if (event.key === 'ArrowRight') showNext();
		if (event.key === 'ArrowLeft') showPrevious();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<section
	class="relative overflow-hidden border-y border-primary/10 bg-card/20 px-4 py-24 backdrop-blur-xl sm:px-6 lg:px-8"
>
	<div
		class="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_bottom_right,hsl(var(--primary)/0.12),transparent_38%)]"
	></div>
	<div
		class="absolute top-16 left-[-10%] -z-10 h-80 w-80 animate-pulse rounded-full bg-primary/10 blur-3xl"
	></div>
	<div
		class="absolute right-[-10%] bottom-16 -z-10 h-80 w-80 animate-pulse rounded-full bg-primary/10 blur-3xl"
	></div>

	<div class="mx-auto max-w-7xl">
		<div class="grid gap-10 lg:grid-cols-12 lg:items-end">
			<div transition:fly={{ x: -20, duration: 600 }} class="lg:col-span-7">
				<div
					class="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-wider text-primary uppercase backdrop-blur-xl"
				>
					<CameraIcon class="size-3 animate-pulse" />
					Team & Store Gallery
				</div>

				<h2 class="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">
					A closer look at the people, store, and power-ready products behind dana.
				</h2>

				<p class="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
					Explore our local electronics experience: the team helping customers choose the right
					power banks and chargers, the store environment, and the product displays built around
					daily charging needs.
				</p>
			</div>

			<div transition:fly={{ x: 20, duration: 600, delay: 120 }} class="lg:col-span-5">
				<Card
					class="relative overflow-hidden border-primary/10 bg-background/35 shadow-2xl backdrop-blur-2xl"
				>
					<div
						class="grid-drift absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.06)_1px,transparent_1px)] bg-[size:26px_26px]"
					></div>
					<CardContent class="relative p-6">
						<div class="mb-5 flex items-center justify-between border-b border-primary/10 pb-4">
							<span class="font-mono text-xs text-muted-foreground">GALLERY_STATUS</span>
							<span class="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary"
								>18 PHOTOS</span
							>
						</div>

						<div class="grid gap-3 sm:grid-cols-3">
							{#each highlights as item (item.value)}
								<div class="rounded-2xl border border-primary/10 bg-card/40 p-4 backdrop-blur-xl">
									<div
										class="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
									>
										<item.icon class="size-5" />
									</div>
									<p class="font-mono text-lg font-black text-primary">{item.value}</p>
									<p class="mt-1 text-[11px] leading-relaxed text-white">{item.label}</p>
								</div>
							{/each}
						</div>
					</CardContent>
				</Card>
			</div>
		</div>

		<div class="mt-8 grid auto-rows-[210px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each filteredImages as image, index (image.src)}
				<button
					type="button"
					onclick={() => openViewer(index)}
					transition:fly={{ y: 18, duration: 450, delay: (index % 8) * 45 }}
					class="group relative overflow-hidden rounded-3xl border border-primary/10 bg-card/35 text-left shadow-xl backdrop-blur-2xl transition duration-500 hover:-translate-y-1 hover:border-primary/30 hover:shadow-2xl {index ===
						0 || index === 7
						? 'sm:col-span-2 sm:row-span-2'
						: ''}"
				>
					<img
						src={image.src}
						alt={image.alt}
						loading="lazy"
						class="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110"
					/>
					<div
						class="absolute inset-0 bg-linear-to-t from-background/90 via-background/20 to-transparent opacity-85 transition duration-500 group-hover:opacity-95"
					></div>
					<div
						class="absolute inset-0 bg-primary/0 mix-blend-overlay transition duration-500 group-hover:bg-primary/20"
					></div>

					<div
						class="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full border border-white/15 bg-background/45 text-foreground opacity-0 shadow-lg backdrop-blur-xl transition duration-300 group-hover:opacity-100"
					>
						<Maximize2Icon class="size-4" />
					</div>
				</button>
			{/each}
		</div>
	</div>
</section>

{#if selectedImage}
	<div
		class="fixed inset-0 z-50 overflow-hidden bg-background/85 backdrop-blur-2xl"
		transition:fade={{ duration: 180 }}
		role="dialog"
		aria-modal="true"
		aria-label="dana gallery image viewer"
	>
		<button
			class="absolute inset-0 cursor-default"
			type="button"
			aria-label="Close gallery viewer"
			onclick={closeViewer}
		></button>

		<div class="relative mx-auto flex h-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
			<div
				class="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-primary/10 bg-card/50 p-3 shadow-2xl backdrop-blur-2xl"
			>
				<div class="flex min-w-0 items-center gap-3">
					<div
						class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<SparklesIcon class="size-5" />
					</div>
					<div class="min-w-0">
						<p class="truncate text-sm font-black">{selectedImage.title}</p>
						<p class="truncate text-xs text-muted-foreground">
							{imageNotes[selectedImage.type]} · Image {selectedIndex === null
								? 0
								: selectedIndex + 1} of {filteredImages.length}
						</p>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<button
						type="button"
						class="flex size-10 items-center justify-center rounded-md border border-primary/10 bg-background/40 text-foreground transition hover:bg-primary hover:text-primary-foreground"
						onclick={showPrevious}
						aria-label="Previous image"
					>
						<ChevronLeftIcon class="size-4" />
					</button>
					<button
						type="button"
						class="flex size-10 items-center justify-center rounded-md border border-primary/10 bg-background/40 text-foreground transition hover:bg-primary hover:text-primary-foreground"
						onclick={showNext}
						aria-label="Next image"
					>
						<ChevronRightIcon class="size-4" />
					</button>
					<button
						type="button"
						class="flex size-10 items-center justify-center rounded-md border border-primary/10 bg-background/40 text-foreground transition hover:bg-primary hover:text-primary-foreground"
						onclick={closeViewer}
						aria-label="Close gallery viewer"
					>
						<XIcon class="size-4" />
					</button>
				</div>
			</div>

			<div class="grid min-h-0 flex-1 gap-4 lg:grid-cols-12">
				<div
					class="relative min-h-0 overflow-hidden rounded-[2rem] border border-primary/10 bg-card/35 shadow-2xl backdrop-blur-2xl lg:col-span-9"
				>
					<div
						class="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.16),transparent_45%)]"
					></div>
					{#key selectedImage.src}
						<img
							src={selectedImage.src}
							alt={selectedImage.alt}
							loading="lazy"
							transition:scale={{ duration: 220, start: 0.98 }}
							class="h-full w-full object-contain p-2 sm:p-4"
						/>
					{/key}

					<button
						type="button"
						class="absolute top-1/2 left-4 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-background/50 text-foreground shadow-2xl backdrop-blur-xl transition hover:bg-primary hover:text-primary-foreground"
						onclick={showPrevious}
						aria-label="Previous image"
					>
						<ChevronLeftIcon class="size-5" />
					</button>
					<button
						type="button"
						class="absolute top-1/2 right-4 flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-background/50 text-foreground shadow-2xl backdrop-blur-xl transition hover:bg-primary hover:text-primary-foreground"
						onclick={showNext}
						aria-label="Next image"
					>
						<ChevronRightIcon class="size-5" />
					</button>
				</div>

				<Card
					class="hidden border-primary/10 bg-card/45 shadow-2xl backdrop-blur-2xl lg:col-span-3 lg:block"
				>
					<CardContent class="flex h-full flex-col p-5">
						<div class="rounded-2xl border border-primary/10 bg-background/40 p-4">
							<div
								class="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"
							>
								{#if selectedImage.type === 'team'}
									<UsersIcon class="size-6" />
								{:else if selectedImage.type === 'store'}
									<StoreIcon class="size-6" />
								{:else}
									<ZapIcon class="size-6" />
								{/if}
							</div>
							<p class="font-mono text-xs font-bold text-primary">
								dana PHOTO {String(selectedImage.number).padStart(2, '0')}
							</p>
							<h3 class="mt-3 text-2xl font-black tracking-tight">{selectedImage.title}</h3>
							<p class="mt-3 text-sm leading-relaxed text-muted-foreground">
								{selectedImage.detail}
							</p>
						</div>

						<div class="mt-4 grid gap-3">
							<div
								class="flex items-center gap-3 rounded-2xl border border-primary/10 bg-background/40 p-4"
							>
								<MapPinIcon class="size-4 text-primary" />
								<span class="text-xs font-semibold text-muted-foreground"
									>Addis Ababa customer experience</span
								>
							</div>
							<div
								class="flex items-center gap-3 rounded-2xl border border-primary/10 bg-background/40 p-4"
							>
								<BatteryChargingIcon class="size-4 text-primary" />
								<span class="text-xs font-semibold text-muted-foreground"
									>Power banks, chargers, and accessories</span
								>
							</div>
						</div>

						<div class="mt-auto pt-4">
							<Button href="/shop" class="group w-full gap-2">
								Shop dana Products
								<ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-1" />
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			<div
				class="mt-4 flex gap-3 overflow-x-auto rounded-2xl border border-primary/10 bg-card/40 p-3 shadow-2xl backdrop-blur-2xl"
			>
				{#each filteredImages as image, index (image.src)}
					<button
						type="button"
						onclick={() => openViewer(index)}
						class="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border transition duration-300 {selectedIndex ===
						index
							? 'border-primary ring-2 ring-primary/30'
							: 'border-primary/10 opacity-60 hover:opacity-100'}"
						aria-label={`Open ${image.alt}`}
					>
						<img src={image.src} alt="" class="h-full w-full object-cover" loading="lazy" />
					</button>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes grid-drift {
		0% {
			background-position: 0 0;
		}
		100% {
			background-position: 52px 52px;
		}
	}

	.grid-drift {
		animation: grid-drift 18s linear infinite;
	}
</style>
