<script lang="ts">
	import { showcaseSmall } from '$lib/showcaseGallery';

	/**
	 * A slow, endless strip of photos — decoration only, so no captions, no
	 * links and hidden from assistive tech. The list is rendered twice and the
	 * track slides by exactly one copy, so the loop has no seam. Hovering
	 * pauses it; reduced-motion users get a still row.
	 */
	let {
		images,
		reverse = false,
		seconds = 70
	}: { images: string[]; reverse?: boolean; seconds?: number } = $props();
</script>

{#if images.length}
	<div
		class="ribbon overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]"
		aria-hidden="true"
	>
		<div class="track flex w-max" class:reverse style:--ribbon-duration="{seconds}s">
			{#each [0, 1] as copy (copy)}
				<div class="flex shrink-0 gap-4 pr-4">
					{#each images as src, i (`${copy}-${i}`)}
						<img
							src={showcaseSmall(src)}
							alt=""
							loading="lazy"
							decoding="async"
							class="aspect-[4/3] h-36 w-auto rounded-2xl object-cover shadow-md ring-1 ring-black/5 sm:h-48"
						/>
					{/each}
				</div>
			{/each}
		</div>
	</div>
{/if}

<style>
	.track {
		animation: ribbon var(--ribbon-duration) linear infinite;
	}
	.track.reverse {
		animation-direction: reverse;
	}
	.ribbon:hover .track {
		animation-play-state: paused;
	}
	@keyframes ribbon {
		to {
			transform: translateX(-50%);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.track {
			animation: none;
		}
	}
</style>
