<script lang="ts">
	import { showcaseSrcset } from '$lib/showcaseGallery';

	/**
	 * A faded photo that sits behind the top of a page and dissolves into the
	 * background. Purely decorative: the parent needs `relative isolate` so the
	 * -z-10 here lands above the parent's own background, not behind it.
	 */
	let { src }: { src: string } = $props();
</script>

{#if src}
	<div
		class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[380px] overflow-hidden sm:h-[480px]"
		aria-hidden="true"
	>
		<!-- Low priority: it's above the fold, but the heading and form matter more. -->
		<img
			{src}
			srcset={showcaseSrcset(src)}
			sizes="100vw"
			alt=""
			fetchpriority="low"
			decoding="async"
			class="size-full object-cover opacity-25 [mask-image:linear-gradient(to_bottom,black_5%,transparent_90%)] dark:opacity-15"
		/>
	</div>
{/if}
