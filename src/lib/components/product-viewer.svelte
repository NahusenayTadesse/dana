<script lang="ts">
	import { MediaQuery } from 'svelte/reactivity';
	import type { Attachment } from 'svelte/attachments';
	import { Play, Pause, Volume2, VolumeX, Maximize, RotateCw, ZoomIn } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	type Props = {
		/** Folder under /videos holding the clip, the poster and (optionally) spin frames. */
		base: string;
		poster: string;
		/** Accessible name for the viewer. */
		label: string;
		/**
		 * How many stills sit in <base>/spin. Given, the card is a turntable the
		 * viewer can orbit; left out, it is a plain clip with the same chrome.
		 */
		frameCount?: number;
		/** Smaller rendition, handed to phones and narrow windows. */
		small?: boolean;
		/** Whether the clip carries sound; without it the mute button is noise. */
		hasAudio?: boolean;
		class?: string;
	};

	let {
		base,
		poster,
		label,
		frameCount = 0,
		small = false,
		hasAudio = false,
		class: klass = ''
	}: Props = $props();

	const spins = $derived(frameCount > 0);
	const frames = $derived(
		Array.from({ length: frameCount }, (_, i) => `${base}/spin/${String(i).padStart(2, '0')}.webp`)
	);
	/** Same stills at full width, fetched one at a time only when magnified. */
	const detail = $derived(frames.map((f) => f.replace('/spin/', '/spin/hi/')));

	let host = $state<HTMLElement | null>(null);
	let panel = $state<HTMLElement | null>(null);
	let inner = $state<HTMLElement | null>(null);
	let video = $state<HTMLVideoElement | null>(null);

	let near = $state(false);
	let visible = $state(false);

	/** The clip is only fetched once the viewer asks for it — by pressing play,
	    or by taking hold of the card, which hands the drag over to the video. */
	let started = $state(false);
	/** What the viewer asked for. `paused` follows once the media can play. */
	let wantPlay = $state(false);
	let paused = $state(true);
	let muted = $state(true);
	let ready = $state(false);
	let dragging = $state(false);
	let touched = $state(false);

	/** Which still is face-on, 0…frameCount-1. */
	let index = $state(0);
	let tiltY = $state(0);
	let tiltX = $state(0);
	/** Magnification, 1 = fit. Above 1 the drag pans instead of turning. */
	let zoom = $state(1);
	/** The magnified still that has loaded, so it can't flash in blank. */
	let detailAt = $state(-1);
	/** Seconds of footage, once the clip has reported it. */
	let span = $state(0);

	/**
	 * Once the clip can be seeked, the drag scrubs the footage itself rather than
	 * stepping between stills: same gesture, every frame the camera shot.
	 */
	const scrubbing = $derived(spins && started && ready && span > 0 && !wantPlay);

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	const phone = new MediaQuery('(max-width: 900px)');
	const zoomed = $derived(zoom > 1.02);

	// Phones get the narrower encode; it is chosen once, when play is pressed.
	const clip = $derived(`${base}/clip${small || phone.current ? '-720' : ''}.mp4`);

	// Half the stills carry the turn on their own, so the rest can wait until the
	// card is actually on screen.
	const shown = $derived(visible ? index : index - (index % 2));

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

	const watch: Attachment<HTMLElement> = (node) => {
		const warm = observe(node, '700px 0px', 0, (v) => {
			if (v) near = true;
		});
		const onscreen = observe(node, '0px', 0.3, (v) => (visible = v));
		return () => {
			warm();
			onscreen();
		};
	};

	// Asking the element to play before it can decode gets the request cancelled,
	// so playback waits for the first frame.
	$effect(() => {
		if (!video) return;
		paused = !(wantPlay && ready);
	});

	// Scrolling a playing clip off screen pauses it; it does not resume on its own.
	$effect(() => {
		if (started && !visible) wantPlay = false;
	});

	// --- Turntable -------------------------------------------------------------
	// `spot` is an unbounded position in frame units. The clip is a continuous
	// orbit, so it wraps: turning past the last still lands back on the first.

	const IDLE_TURN = 0.03; // frames per tick, the unattended drift
	const ZOOM_MAX = 2.6;

	const spot = { at: 0, v: IDLE_TURN };
	const view = { zoom: 1, x: 0, y: 0, ez: 1, ex: 0, ey: 0 };
	let hovering = false;
	let lastTouch = 0;
	let travelled = 0;

	const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
	const wrap = (at: number, n: number) => (n ? ((at % n) + n) % n : 0);

	/** Offsets are a share of the panel, so they can never expose an edge. */
	function clampPan() {
		const reach = ((view.zoom - 1) / 2) * 100;
		view.x = clamp(view.x, -reach, reach);
		view.y = clamp(view.y, -reach, reach);
	}

	function setZoom(next: number, originX = 0.5, originY = 0.5) {
		const before = view.zoom;
		view.zoom = clamp(next, 1, ZOOM_MAX);
		if (view.zoom === 1) {
			view.x = 0;
			view.y = 0;
			return;
		}
		// Keep whatever sits under the pointer roughly under it as it magnifies.
		const grow = view.zoom / before - 1;
		view.x -= (originX - 0.5) * 100 * grow;
		view.y -= (originY - 0.5) * 100 * grow;
		clampPan();
	}

	function turnBy(by: number) {
		spot.at += by;
		spot.v = 0;
		index = Math.round(wrap(spot.at, frameCount));
		lastTouch = performance.now();
		touched = true;
	}

	/** Where in the footage the current position sits, in seconds. */
	function seek() {
		const el = video;
		// Only a turntable maps its position onto the footage; a plain clip has no
		// frames to divide by.
		if (!el || !span || !frameCount) return;
		const at = (wrap(spot.at, frameCount) / frameCount) * span;
		// A tenth of a frame is below what anyone can see; seeking for it only
		// makes the decoder thrash.
		if (Math.abs(el.currentTime - at) < 0.02) return;
		if (el.fastSeek) el.fastSeek(at);
		else el.currentTime = at;
	}

	function togglePlay() {
		wantPlay = !wantPlay;
		if (wantPlay) {
			started = true;
			setZoom(1);
		}
	}

	// One gesture handler for mouse, pen and touch: drag turns the object, a
	// second finger pinches, a magnified drag pans, a tap plays.
	const gestures: Attachment<HTMLElement> = (node) => {
		const active = new Map<number, { x: number; y: number }>();
		const panelBox = () => (panel ?? node).getBoundingClientRect();
		let lastX = 0;
		let lastY = 0;
		let lastMove = 0;
		let pinchGap = 0;
		let pinchZoom = 1;
		let tapAt = 0;
		let tapTimer: ReturnType<typeof setTimeout> | undefined;

		const centre = () => {
			let x = 0;
			let y = 0;
			for (const p of active.values()) {
				x += p.x;
				y += p.y;
			}
			return { x: x / active.size, y: y / active.size };
		};
		const gap = () => {
			const [a, b] = [...active.values()];
			return Math.hypot(a.x - b.x, a.y - b.y);
		};

		const down = (e: PointerEvent) => {
			if (e.button !== 0 || (e.target as Element).closest('button')) return;
			node.setPointerCapture(e.pointerId);
			active.set(e.pointerId, { x: e.clientX, y: e.clientY });

			if (active.size === 2) {
				pinchGap = gap();
				pinchZoom = view.zoom;
				dragging = false;
			} else {
				lastX = e.clientX;
				lastY = e.clientY;
				lastMove = performance.now();
				travelled = 0;
				spot.v = 0;
				dragging = true;
				// Taking hold is intent enough to fetch the footage; until it lands
				// the stills carry the turn, then the video takes the gesture over.
				if (spins) started = true;
			}
		};

		const move = (e: PointerEvent) => {
			const box = panelBox();

			// A little depth: the panel leans toward the pointer.
			if (!zoomed) {
				tiltY = ((e.clientX - box.left) / box.width - 0.5) * 8;
				tiltX = (0.5 - (e.clientY - box.top) / box.height) * 4.5;
			}

			if (!active.has(e.pointerId)) return;
			const prev = centre();
			active.set(e.pointerId, { x: e.clientX, y: e.clientY });
			const now = performance.now();

			if (active.size >= 2) {
				const spread = gap();
				if (pinchGap > 0) {
					const mid = centre();
					setZoom(
						pinchZoom * (spread / pinchGap),
						(mid.x - box.left) / box.width,
						(mid.y - box.top) / box.height
					);
					view.x += ((mid.x - prev.x) / box.width) * 100;
					view.y += ((mid.y - prev.y) / box.height) * 100;
					clampPan();
				}
				travelled += 20;
				lastTouch = now;
				touched = true;
				return;
			}

			const dx = e.clientX - lastX;
			const dy = e.clientY - lastY;
			travelled += Math.abs(dx) + Math.abs(dy);
			lastX = e.clientX;
			lastY = e.clientY;
			lastTouch = now;

			if (zoomed) {
				view.x += (dx / box.width) * 100;
				view.y += (dy / box.height) * 100;
				clampPan();
				touched = true;
				return;
			}

			if (!spins || wantPlay) return;

			// Dragging the full width of the panel carries it once round the orbit.
			const step = (dx / box.width) * frameCount;
			spot.at += step;
			spot.v = step / Math.max(1, (now - lastMove) / 16.7);
			lastMove = now;
			touched = true;
		};

		const up = (e: PointerEvent) => {
			if (!active.delete(e.pointerId)) return;
			if (active.size < 2) pinchGap = 0;
			if (active.size > 0) {
				const rest = [...active.values()][0];
				lastX = rest.x;
				lastY = rest.y;
				lastMove = performance.now();
				return;
			}

			dragging = false;
			lastTouch = performance.now();
			spot.v = clamp(spot.v, -0.5, 0.5);
			if (travelled >= 8) return;

			// A tap plays or pauses and a double tap magnifies, so the single tap
			// waits long enough to find out which it was.
			const now = performance.now();
			const second = now - tapAt < 300;
			tapAt = second ? 0 : now;

			if (second) {
				clearTimeout(tapTimer);
				const box = panelBox();
				setZoom(
					zoomed ? 1 : 2,
					(e.clientX - box.left) / box.width,
					(e.clientY - box.top) / box.height
				);
			} else {
				tapTimer = setTimeout(togglePlay, 260);
			}
		};

		const wheel = (e: WheelEvent) => {
			// Plain scrolling belongs to the page; ctrl/⌘ magnifies, as on a map,
			// and a trackpad's sideways swipe turns the object.
			if (e.ctrlKey || e.metaKey) {
				e.preventDefault();
				const box = panelBox();
				setZoom(
					view.zoom * Math.exp(-e.deltaY * 0.0022),
					(e.clientX - box.left) / box.width,
					(e.clientY - box.top) / box.height
				);
				touched = true;
			} else if (spins && !wantPlay && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
				e.preventDefault();
				turnBy((e.deltaX / panelBox().width) * frameCount);
			}
		};

		const enter = () => (hovering = true);
		const leave = () => {
			hovering = false;
			tiltY = 0;
			tiltX = 0;
			lastTouch = performance.now();
		};

		node.addEventListener('pointerdown', down);
		node.addEventListener('pointermove', move);
		node.addEventListener('pointerup', up);
		node.addEventListener('pointercancel', up);
		node.addEventListener('pointerenter', enter);
		node.addEventListener('pointerleave', leave);
		node.addEventListener('wheel', wheel, { passive: false });

		return () => {
			clearTimeout(tapTimer);
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointermove', move);
			node.removeEventListener('pointerup', up);
			node.removeEventListener('pointercancel', up);
			node.removeEventListener('pointerenter', enter);
			node.removeEventListener('pointerleave', leave);
			node.removeEventListener('wheel', wheel);
		};
	};

	function keys(e: KeyboardEvent) {
		const step = e.shiftKey ? 3 : 1;
		switch (e.key) {
			case 'ArrowRight':
				turnBy(step);
				break;
			case 'ArrowLeft':
				turnBy(-step);
				break;
			case '+':
			case '=':
				setZoom(view.zoom + 0.4);
				break;
			case '-':
				setZoom(view.zoom - 0.4);
				break;
			case '0':
				setZoom(1);
				break;
			case ' ':
			case 'Enter':
				togglePlay();
				break;
			default:
				return;
		}
		touched = true;
		e.preventDefault();
	}

	// Motion runs in one loop that writes styles straight onto the element, so a
	// 60fps turn never schedules a Svelte update.
	$effect(() => {
		const el = inner;
		if (!el || !visible) return;

		let frame = 0;
		const tick = (t: number) => {
			if (spins && !wantPlay && !dragging) {
				if (reducedMotion.current || hovering || zoomed) {
					spot.v *= 0.9;
				} else if (t - lastTouch > 2000) {
					// Left alone it drifts back to the slow, unattended turn.
					spot.v += (IDLE_TURN - spot.v) * 0.02;
				} else {
					spot.v *= 0.93;
				}
				spot.at += spot.v;

				const next = Math.round(wrap(spot.at, frameCount)) % frameCount;
				if (next !== index) index = next;
				if (scrubbing) seek();
			}

			view.ez += (view.zoom - view.ez) * 0.16;
			view.ex += (view.x - view.ex) * 0.16;
			view.ey += (view.y - view.ey) * 0.16;
			el.style.transform = `translate(${view.ex}%, ${view.ey}%) scale(${view.ez})`;
			if (Math.abs(view.ez - zoom) > 0.01) zoom = view.ez;

			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	});

	function fullscreen() {
		(video ?? host)?.requestFullscreen?.().catch(() => {});
	}
</script>

<div bind:this={host} {@attach watch} class="viewer {klass}">
	<!-- The role and the tab stop are set together, but the pair is computed, so
	     the check can't see that. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<div
		{@attach gestures}
		onkeydown={keys}
		role={spins ? 'slider' : undefined}
		tabindex={spins ? 0 : undefined}
		aria-label={spins ? m.orbit_gesture_hint() : undefined}
		aria-valuemin={spins ? 0 : undefined}
		aria-valuemax={spins ? frameCount - 1 : undefined}
		aria-valuenow={spins ? shown : undefined}
		class="stage"
		class:dragging
		style:--tilt-y="{tiltY}deg"
		style:--tilt-x="{tiltX}deg"
	>
		<div bind:this={panel} class="panel">
			<div bind:this={inner} class="inner">
				{#if spins && near}
					{#each frames as frame, i (frame)}
						{#if i % 2 === 0 || visible}
							<img
								src={frame}
								alt={i === 0 ? label : ''}
								decoding="async"
								fetchpriority={i === 0 ? 'high' : 'low'}
								class="shot"
								style:opacity={i === shown && !wantPlay && !scrubbing ? 1 : 0}
							/>
						{/if}
					{/each}
				{:else}
					<img
						src={poster}
						alt={label}
						class="shot"
						loading="lazy"
						decoding="async"
						style:opacity={wantPlay ? 0 : 1}
					/>
				{/if}

				{#if spins && zoomed && !wantPlay}
					<!-- Magnified: the 800px still would smear, so the wide one is
					     fetched for whichever frame is being inspected. -->
					<img
						src={detail[shown]}
						alt=""
						decoding="async"
						onload={() => (detailAt = shown)}
						class="shot"
						style:opacity={detailAt === shown ? 1 : 0}
					/>
				{/if}

				{#if started}
					<!-- Drone footage: ambient sound or none at all, so there is nothing
					     to caption. -->
					<!-- svelte-ignore a11y_media_has_caption -->
					<video
						bind:this={video}
						bind:paused
						bind:muted
						src={clip}
						onloadedmetadata={(e) => (span = e.currentTarget.duration || 0)}
						onloadeddata={() => {
							ready = true;
							seek();
						}}
						class="shot"
						style:opacity={(wantPlay && ready) || scrubbing ? 1 : 0}
						{poster}
						aria-label={label}
						playsinline
						loop
						preload="auto"
					></video>
				{/if}
			</div>

			<span class="sheen" aria-hidden="true"></span>

			<span class="badge" aria-hidden="true">
				{#if zoomed}
					<ZoomIn class="size-3.5" />
					{zoom.toFixed(1)}×
				{:else if spins}
					<RotateCw class="size-3.5" />
					360°{scrubbing ? ' · HD' : ''}
				{:else}
					<Play class="size-3 fill-current" />
					{m.clip_badge()}
				{/if}
			</span>

			{#if !wantPlay && !zoomed}
				<span class="cue" aria-hidden="true">
					<span class="cue-dot"><Play class="ml-0.5 size-5 fill-current" /></span>
				</span>
			{:else if wantPlay && !ready}
				<span class="cue" aria-hidden="true"><span class="spinner"></span></span>
			{/if}

			{#if spins && !wantPlay}
				<!-- Where in the orbit it stands; a readout, not a control -->
				<span class="rail" aria-hidden="true">
					<span class="pip" style:left="{(shown / frameCount) * 100}%"></span>
				</span>
			{/if}
		</div>
	</div>

	<div class="mt-4 flex flex-wrap items-center gap-2">
		<button
			type="button"
			onclick={togglePlay}
			aria-label={wantPlay ? m.video_pause() : m.video_play()}
			class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
		>
			{#if wantPlay}
				<Pause class="size-4 fill-current" />
			{:else}
				<Play class="ml-0.5 size-4 fill-current" />
			{/if}
		</button>

		{#if hasAudio}
			<button
				type="button"
				onclick={() => (muted = !muted)}
				aria-label={muted ? m.video_unmute() : m.video_mute()}
				disabled={!started}
				class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-default disabled:opacity-40"
			>
				{#if muted}
					<VolumeX class="size-4" />
				{:else}
					<Volume2 class="size-4" />
				{/if}
			</button>
		{/if}

		<button
			type="button"
			onclick={fullscreen}
			aria-label={m.video_fullscreen()}
			class="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border bg-card text-foreground transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
		>
			<Maximize class="size-4" />
		</button>

		<span
			class="ml-1 flex items-center gap-2 text-[11.5px] font-bold tracking-[0.1em] text-muted-foreground uppercase transition-opacity duration-500"
			style:opacity={touched ? 0 : 1}
		>
			<RotateCw class="size-3.5" />
			{spins ? m.orbit_gesture_hint() : m.clip_hint()}
		</span>
	</div>
</div>

<style>
	.stage {
		position: relative;
		border-radius: 1.75rem;
		border: 1px solid var(--border);
		background:
			radial-gradient(
				90% 70% at 50% 0%,
				color-mix(in oklab, var(--primary) 10%, transparent),
				transparent 70%
			),
			linear-gradient(180deg, var(--card), var(--background));
		padding: clamp(0.7rem, 1.8cqw, 1.2rem);
		perspective: 1400px;
		user-select: none;
		overflow: hidden;
		cursor: grab;
		/* Vertical swipes always scroll the page; sideways ones are ours. */
		touch-action: pan-y;
	}
	.stage.dragging {
		cursor: grabbing;
	}
	.stage:focus-visible {
		outline: 2px solid var(--primary);
		outline-offset: 3px;
	}

	.panel {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: 1.1rem;
		background: #0c1b34;
		box-shadow:
			0 24px 50px -24px rgb(0 0 0 / 0.55),
			inset 0 0 0 1px rgb(255 255 255 / 0.08);
		transform: rotateY(var(--tilt-y, 0deg)) rotateX(var(--tilt-x, 0deg));
		transition: transform 260ms ease-out;
	}

	/* Carries the pinch/zoom offset, so stills and clip move together. */
	.inner {
		position: absolute;
		inset: 0;
		will-change: transform;
	}

	.shot {
		position: absolute;
		inset: 0;
		height: 100%;
		width: 100%;
		object-fit: cover;
		/* Snappy enough to read as one turning object rather than a slideshow. */
		transition: opacity 90ms linear;
	}

	.sheen {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background: linear-gradient(
			160deg,
			rgb(255 255 255 / 0.14) 0%,
			rgb(255 255 255 / 0) 40%,
			rgb(12 27 52 / 0.24) 100%
		);
	}

	.badge {
		position: absolute;
		top: 0.85rem;
		left: 0.85rem;
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		border-radius: 999px;
		background: rgb(0 0 0 / 0.48);
		padding: 0.3rem 0.65rem;
		font-size: 11px;
		font-weight: 800;
		letter-spacing: 0.12em;
		font-variant-numeric: tabular-nums;
		color: rgb(255 255 255 / 0.92);
		backdrop-filter: blur(6px);
	}

	.cue {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		pointer-events: none;
	}

	.cue-dot {
		display: grid;
		height: 3.4rem;
		width: 3.4rem;
		place-items: center;
		border-radius: 999px;
		background: rgb(255 255 255 / 0.9);
		color: var(--primary);
		box-shadow: 0 10px 30px rgb(0 0 0 / 0.35);
	}

	.spinner {
		height: 2.2rem;
		width: 2.2rem;
		border-radius: 999px;
		border: 2px solid rgb(255 255 255 / 0.3);
		border-top-color: #fff;
		animation: spin 800ms linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.rail {
		position: absolute;
		bottom: 0.9rem;
		left: 50%;
		height: 3px;
		width: min(42%, 9rem);
		transform: translateX(-50%);
		border-radius: 999px;
		background: rgb(255 255 255 / 0.25);
		pointer-events: none;
	}
	.pip {
		position: absolute;
		top: 50%;
		height: 7px;
		width: 7px;
		border-radius: 999px;
		background: #fff;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.4);
		transform: translate(-50%, -50%);
		transition: left 90ms linear;
	}

	@media (prefers-reduced-motion: reduce) {
		.panel,
		.shot,
		.pip {
			transition: none;
		}
	}
</style>
