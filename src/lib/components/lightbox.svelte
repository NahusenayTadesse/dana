<script lang="ts">
	import { fade, scale, fly } from 'svelte/transition';
	import { Button } from '$lib/components/ui/button';
	import { XIcon, ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';

	let {
		images,
		currentIndex = $bindable(0),
		isOpen = $bindable(false),
		title = 'Gallery'
	} = $props();

	let currentImage = $derived(images[currentIndex]);
	let hasNext = $derived(currentIndex < images.length - 1);
	let hasPrev = $derived(currentIndex > 0);

	function portal(node: HTMLElement) {
		document.body.appendChild(node);

		return {
			destroy() {
				node.remove();
			}
		};
	}

	$effect(() => {
		if (isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}

		return () => {
			document.body.style.overflow = '';
		};
	});

	const close = () => (isOpen = false);
	const next = () => hasNext && currentIndex++;
	const prev = () => hasPrev && currentIndex--;

	const handleKeydown = (e: KeyboardEvent) => {
		if (!isOpen) return;

		if (e.key === 'Escape') close();
		if (e.key === 'ArrowRight') next();
		if (e.key === 'ArrowLeft') prev();
	};
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && currentImage}
	<div
		use:portal
		class="fixed inset-0 z-[9999] flex h-[100dvh] w-[100dvw] flex-col overflow-hidden overscroll-none bg-black text-white"
		role="dialog"
		aria-modal="true"
		aria-label="Image lightbox"
		transition:fade={{ duration: 180 }}
	>
		<header
			class="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 sm:px-6"
		>
			<div class="min-w-0">
				<p class="truncate text-sm font-medium text-white/90 sm:text-base">
					{title}
				</p>
				<p class="text-xs text-white/60 sm:text-sm">
					{currentIndex + 1} of {images.length}
				</p>
			</div>

			<Button
				variant="ghost"
				size="icon"
				class="rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white"
				onclick={close}
				aria-label="Close lightbox"
			>
				<XIcon class="size-5 sm:size-6" />
			</Button>
		</header>

		<main
			class="flex min-h-0 flex-1 items-center justify-center px-3 py-20 sm:px-6 sm:py-24"
			onclick={close}
		>
			{#if hasPrev}
				<Button
					variant="ghost"
					size="icon"
					class="absolute top-1/2 left-3 z-20 size-11 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white sm:left-6 sm:size-12"
					onclick={(e) => {
						e.stopPropagation();
						prev();
					}}
					aria-label="Previous image"
				>
					<ChevronLeftIcon class="size-7" />
				</Button>
			{/if}

			{#key currentIndex}
				<img
					src="/files/{currentImage}"
					alt="{title} - Image {currentIndex + 1}"
					class="max-h-full max-w-full rounded-xl object-contain shadow-2xl select-none"
					transition:scale={{ duration: 180, start: 0.96 }}
					onclick={(e) => e.stopPropagation()}
				/>
			{/key}

			{#if hasNext}
				<Button
					variant="ghost"
					size="icon"
					class="absolute top-1/2 right-3 z-20 size-11 -translate-y-1/2 rounded-full bg-white/10 text-white backdrop-blur-md hover:bg-white/20 hover:text-white sm:right-6 sm:size-12"
					onclick={(e) => {
						e.stopPropagation();
						next();
					}}
					aria-label="Next image"
				>
					<ChevronRightIcon class="size-7" />
				</Button>
			{/if}
		</main>

		{#if images.length > 1}
			<footer
				class="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/80 to-transparent px-3 pt-10 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6"
				transition:fly={{ y: 20, duration: 180 }}
			>
				<div
					class="mx-auto flex max-w-full gap-2 overflow-x-auto rounded-2xl bg-white/10 p-2 backdrop-blur-md sm:max-w-3xl"
				>
					{#each images as image, index (image)}
						<button
							class={[
								'h-14 w-14 shrink-0 overflow-hidden rounded-xl border transition-all sm:h-16 sm:w-16',
								index === currentIndex ? 'border-white opacity-100' : 'border-white/10 opacity-55'
							]}
							onclick={() => (currentIndex = index)}
							aria-label="View image {index + 1}"
							aria-current={index === currentIndex ? 'true' : undefined}
						>
							<img
								src="/files/{image}"
								alt="Thumbnail {index + 1}"
								class="size-full object-cover"
							/>
						</button>
					{/each}
				</div>
			</footer>
		{/if}
	</div>
{/if}
