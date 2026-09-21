<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';
	import { Play, Pause, Volume2, VolumeX, Maximize, ZoomIn, ZoomOut } from '@lucide/svelte';
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
		/** 360-style look-around: drag to steer an oversized frame, with idle drift and zoom. */
		pan?: boolean;
	};

	let { src, fallback, poster, label, class: klass = '', pan = false }: Props = $props();

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

	// --- Look-around -----------------------------------------------------------
	// The frame is rendered larger than its box and dragging slides it, so a flat
	// clip reads like a panorama you can steer. Motion runs in a rAF loop that
	// writes styles directly, keeping per-frame work out of the reactive graph.

	const SCALE = 1.35;
	const SCALE_ZOOMED = 1.9;

	let stage = $state<HTMLElement | null>(null);
	let compass = $state<HTMLElement | null>(null);
	let dragging = $state(false);
	let explored = $state(false);
	let zoomed = $state(false);

	/** Where the view is heading, -1..1 on each axis; the loop eases toward it. */
	const aim = { x: 0, y: 0 };
	/** Where it is now. Kept across loop restarts so scrolling away and back doesn't jump. */
	const now = { x: 0, y: 0, s: SCALE };
	let hovering = false;
	let lastTouch = 0;

	const clamp = (v: number) => Math.max(-1, Math.min(1, v));

	const lookAround: Attachment<HTMLElement> = (node) => {
		let pointer: number | null = null;
		let lastX = 0;
		let lastY = 0;

		const down = (e: PointerEvent) => {
			if (e.button !== 0 || (e.target as Element).closest('button')) return;
			pointer = e.pointerId;
			node.setPointerCapture(pointer);
			lastX = e.clientX;
			lastY = e.clientY;
			dragging = true;
		};
		const move = (e: PointerEvent) => {
			if (e.pointerId !== pointer) return;
			const box = node.getBoundingClientRect();
			// The view follows the pointer, like grabbing the scene itself.
			aim.x = clamp(aim.x + ((e.clientX - lastX) / box.width) * 2.4);
			aim.y = clamp(aim.y + ((e.clientY - lastY) / box.height) * 2.4);
			lastX = e.clientX;
			lastY = e.clientY;
			lastTouch = performance.now();
			explored = true;
		};
		const up = (e: PointerEvent) => {
			if (e.pointerId !== pointer) return;
			pointer = null;
			dragging = false;
			lastTouch = performance.now();
		};
		const enter = () => (hovering = true);
		const leave = () => {
			hovering = false;
			lastTouch = performance.now();
		};
		const dblclick = (e: MouseEvent) => {
			if (!(e.target as Element).closest('button')) zoomed = !zoomed;
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		node.addEventListener('pointerenter', enter);
		node.addEventListener('pointerleave', leave);
		node.addEventListener('dblclick', dblclick);

		return () => {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointerleave', leave);
			node.removeEventListener('dblclick', dblclick);
		};
	};

	// Only animate while the clip is on screen.
	$effect(() => {
		const el = stage;
		const dot = compass;
		if (!pan || !el) return;
		// Start oversized so the frame doesn't pop in scale when the loop begins.
		if (!el.style.transform) el.style.transform = `scale(${now.s})`;
		if (!visible) return;

		let drift = 1;
		let frame = 0;

		const tick = (t: number) => {
			// Left alone, the view slowly sweeps side to side like an auto-rotating
			// panorama, and eases back toward the horizon.
			if (!dragging && !hovering && !reducedMotion.current && t - lastTouch > 2500) {
				aim.x += drift * 0.0011;
				if (Math.abs(aim.x) >= 1) {
					aim.x = Math.sign(aim.x);
					drift = -drift;
				}
				aim.y *= 0.995;
			}

			const ease = dragging ? 0.25 : 0.08;
			now.x += (aim.x - now.x) * ease;
			now.y += (aim.y - now.y) * ease;
			now.s += ((zoomed ? SCALE_ZOOMED : SCALE) - now.s) * 0.1;

			// How far the oversized frame can slide before an edge shows, as a
			// percentage of the box.
			const reach = ((now.s - 1) / 2) * 100;
			el.style.transform = `translate3d(${now.x * reach}%, ${now.y * reach}%, 0) scale(${now.s})`;
			if (dot) dot.style.left = `${(1 - now.x) * 50}%`;

			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(frame);
	});
</script>

<div
	{@attach watch}
	{@attach pan && lookAround}
	class="group relative aspect-video overflow-hidden rounded-[2rem] bg-[#0C1B34] shadow-2xl shadow-brand/20 {pan
		? `touch-pan-y select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`
		: ''} {klass}"
>
	<!-- Everything that pans lives in the stage; controls stay put above it -->
	<div bind:this={stage} class="absolute inset-0 will-change-transform">
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
	</div>

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

	{#if pan}
		<!-- Heading indicator: where in the sweep the view is pointing -->
		<div
			class="pointer-events-none absolute top-4 right-4 h-1.5 w-20 rounded-full bg-white/20 backdrop-blur"
			aria-hidden="true"
		>
			<span
				bind:this={compass}
				class="absolute top-1/2 left-1/2 h-1.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
			></span>
		</div>

		<!-- Drag hint, retired once the viewer has looked around -->
		<div
			class="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2.5 rounded-full border border-white/15 bg-black/55 py-2 pr-3.5 pl-2.5 backdrop-blur-md transition-opacity duration-500"
			style:opacity={explored ? 0 : 1}
			aria-hidden="true"
		>
			<span
				class="flex size-[26px] animate-spin items-center justify-center rounded-full border-[1.5px] border-dashed border-white/80 [animation-duration:8s]"
			>
				<span class="size-[5px] rounded-full bg-white"></span>
			</span>
			<span class="text-[11px] font-bold tracking-[0.12em] text-white/85 uppercase">
				{m.pano_control()}
			</span>
		</div>
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

		{#if pan}
			<button
				type="button"
				onclick={() => (zoomed = !zoomed)}
				aria-label={zoomed ? m.video_zoom_out() : m.video_zoom_in()}
				aria-pressed={zoomed}
				class="flex size-10 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
			>
				{#if zoomed}
					<ZoomOut class="size-4" />
				{:else}
					<ZoomIn class="size-4" />
				{/if}
			</button>
		{/if}

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
