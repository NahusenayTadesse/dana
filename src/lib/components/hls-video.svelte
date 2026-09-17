<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';
	import { Play, Pause, Volume2, VolumeX, Maximize } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	type Props = {
		/** HLS master playlist — the adaptive ladder. */
		src: string;
		/** Progressive MP4, used where neither native HLS nor MSE is available. */
		fallback: string;
		poster: string;
		/** Accessible name for the player. */
		label: string;
		class?: string;
	};

	let { src, fallback, poster, label, class: klass = '' }: Props = $props();

	let video = $state<HTMLVideoElement | null>(null);

	// `near` arms the stream before the section is on screen; `visible` drives
	// play/pause, so a clip off screen never burns bandwidth.
	let near = $state(false);
	let visible = $state(false);

	let paused = $state(true);
	let muted = $state(true);
	let userPaused = $state(false);
	let ready = $state(false);
	/** Height of the rendition hls.js settled on, e.g. 720 — shown as a quality badge. */
	let height = $state(0);

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	function observe(el: Element, margin: string, ratio: number, set: (v: boolean) => void) {
		const io = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) set(entry.isIntersecting);
			},
			{ rootMargin: margin, threshold: ratio }
		);
		io.observe(el);
		return () => io.disconnect();
	}

	// Two observers rather than one: the stream should warm up well before the
	// clip is on screen, but playback should only start once it actually is.
	const watch: Attachment<HTMLElement> = (node) => {
		const warm = observe(node, '600px 0px', 0, (v) => {
			if (v) near = true;
		});
		const onscreen = observe(node, '0px', 0.35, (v) => (visible = v));

		return () => {
			warm();
			onscreen();
		};
	};

	// Attach a source only once the clip is worth loading.
	$effect(() => {
		const el = video;
		if (!el || !near) return;

		let hls: { destroy: () => void } | undefined;
		let cancelled = false;

		// Safari and iOS stream HLS natively; everywhere else needs Media Source
		// Extensions, which hls.js drives — imported here so the ~100kB parser is
		// only fetched by visitors who actually reach a video.
		if (el.canPlayType('application/vnd.apple.mpegurl')) {
			el.src = src;
		} else {
			import('hls.js/light')
				.then(({ default: Hls }) => {
					if (cancelled) return;
					if (!Hls.isSupported()) {
						el.src = fallback;
						return;
					}

					const instance = new Hls({
						// Never pull a rendition larger than the box it renders in.
						capLevelToPlayerSize: true,
						startLevel: -1,
						maxBufferLength: 20,
						maxMaxBufferLength: 40
					});
					hls = instance;

					instance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
						height = instance.levels[data.level]?.height ?? 0;
					});
					instance.on(Hls.Events.ERROR, (_, data) => {
						// A fatal error means the ladder is unusable; drop to the flat MP4
						// rather than leaving the poster up forever.
						if (!data.fatal) return;
						instance.destroy();
						if (hls === instance) hls = undefined;
						el.src = fallback;
					});

					instance.loadSource(src);
					instance.attachMedia(el);
				})
				.catch(() => {
					if (!cancelled) el.src = fallback;
				});
		}

		return () => {
			cancelled = true;
			hls?.destroy();
		};
	});

	// Autoplay is muted and scroll-driven; a manual pause sticks until the viewer
	// presses play again, and reduced-motion visitors get a still poster.
	$effect(() => {
		if (!video) return;
		if (visible && !userPaused && !reducedMotion.current) paused = false;
		else if (!visible) paused = true;
	});

	function toggle() {
		userPaused = !paused;
		paused = !paused;
	}

	function fullscreen() {
		video?.requestFullscreen?.().catch(() => {});
	}
</script>

<div
	{@attach watch}
	class="group relative aspect-video overflow-hidden rounded-[2rem] bg-[#0C1B34] shadow-2xl shadow-brand/20 {klass}"
>
	<video
		bind:this={video}
		bind:paused
		bind:muted
		onloadeddata={() => (ready = true)}
		class="h-full w-full object-cover transition-opacity duration-700"
		style:opacity={ready ? 1 : 0}
		{poster}
		aria-label={label}
		playsinline
		loop
		preload="none"
	></video>

	<!-- Poster stand-in while the first segment lands, so the card is never blank -->
	{#if !ready}
		<div
			class="absolute inset-0 bg-cover bg-center"
			style="background-image:url('{poster}')"
			aria-hidden="true"
		></div>
	{/if}

	<div
		class="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(12,27,52,0)_55%,rgba(12,27,52,.68)_100%)]"
	></div>

	<!-- Quality badge — shows the rung the adaptive stream settled on -->
	{#if height}
		<span
			class="absolute top-4 left-4 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white/90 tabular-nums opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
		>
			{height}p
		</span>
	{/if}

	<div class="absolute right-4 bottom-4 flex items-center gap-2">
		<button
			type="button"
			onclick={toggle}
			aria-label={paused ? m.video_play() : m.video_pause()}
			class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-brand shadow-lg transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
		>
			{#if paused}
				<Play class="ml-0.5 size-4 fill-current" />
			{:else}
				<Pause class="size-4 fill-current" />
			{/if}
		</button>

		<button
			type="button"
			onclick={() => (muted = !muted)}
			aria-label={muted ? m.video_unmute() : m.video_mute()}
			class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
		>
			{#if muted}
				<VolumeX class="size-4" />
			{:else}
				<Volume2 class="size-4" />
			{/if}
		</button>

		<button
			type="button"
			onclick={fullscreen}
			aria-label={m.video_fullscreen()}
			class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
		>
			<Maximize class="size-4" />
		</button>
	</div>
</div>
