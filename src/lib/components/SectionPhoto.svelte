<script lang="ts">
	import { showcaseSrcset } from '$lib/showcaseGallery';

	/**
	 * A photo filling the section behind its content. Purely decorative.
	 *
	 * - `soft`: faint, and fades out at the top and bottom edges so the section
	 *   melts into the page. Normal text colours stay readable on it.
	 * - `dark`: full strength under a fixed navy wash, for white text.
	 * - `plain`: full strength, nothing on top — for content that brings its
	 *   own surface (e.g. a frosted card).
	 *
	 * The parent needs `relative isolate overflow-hidden`: isolate makes the
	 * -z-10 here land above the parent's own background rather than behind it.
	 * Lazy-loaded, so it costs nothing until the section is near the viewport.
	 */
	let {
		src,
		tone = 'soft',
		position = 'center'
	}: { src: string; tone?: 'soft' | 'dark' | 'plain'; position?: string } = $props();
</script>

{#if src}
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
		<img
			{src}
			srcset={showcaseSrcset(src)}
			sizes="100vw"
			alt=""
			loading="lazy"
			decoding="async"
			style:object-position={position}
			class={[
				'size-full object-cover',
				tone === 'soft' &&
					'opacity-[0.16] [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)] dark:opacity-[0.12]'
			]}
		/>
		{#if tone === 'dark'}
			<div
				class="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,27,52,.8)_0%,rgba(12,27,52,.9)_100%)]"
			></div>
		{/if}
	</div>
{/if}
