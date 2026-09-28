<script lang="ts">
	import { onMount } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { MediaQuery } from 'svelte/reactivity';
	import { ArrowRight, Play, Pause, ShieldCheck, Truck, Layers, Factory } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { siteSettingText } from '$lib/siteSettings.svelte';

	let { quoteUrl = '/checkout', watchUrl = '/factory' } = $props();

	// Both lines of the trust badge come from Page Text & Figures, per language.
	const trustCount = $derived(siteSettingText('hero_trust_count'));
	const trustSub = $derived(siteSettingText('hero_trust_sub'));

	const stats = [
		{ icon: ShieldCheck, label: m.hero_stat_quality },
		{ icon: Truck, label: m.hero_stat_delivery },
		{ icon: Layers, label: m.hero_stat_profiles },
		{ icon: Factory, label: m.hero_stat_manufacturing }
	];

	// Background reel — the branded roof clips in /static/videos, played one after
	// the other and dissolving into each other. Each folder holds a 1080p encode,
	// a 720p one for phones and a poster; scripts/encode-videos.sh makes them.
	const clips = [
		{ key: 'villa-green', title: m.hero_clip_villa_green },
		{ key: 'apartment-green', title: m.hero_clip_apartment_green },
		{ key: 'villa-red', title: m.hero_clip_villa_red },
		{ key: 'villa-charcoal', title: m.hero_clip_villa_charcoal },
		{ key: 'bungalow-green', title: m.hero_clip_bungalow_green },
		{ key: 'fence-grass', title: m.hero_clip_fence_grass }
	].map((clip) => ({ ...clip, base: `/videos/${clip.key}` }));

	/** Seconds the outgoing and incoming clips overlap. */
	const FADE = 1.4;

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');

	let videos = $state<(HTMLVideoElement | undefined)[]>([]);
	let active = $state(0);
	/** Share of the active clip already played, drives its chapter bar. */
	let progress = $state(0);
	/** Which clips have been handed a src. The next one is only fetched once
	    the current one is under way, so the page never pulls both up front. */
	let wanted = $state(clips.map(() => false));
	/** Which clips have a frame on screen, so they fade in over the poster
	    rather than flashing black. */
	let ready = $state(clips.map(() => false));
	let mounted = $state(false);
	let inView = $state(true);
	let userPaused = $state(false);
	/** Phones get the narrower encode; chosen once so a resize can't reload. */
	let small = false;

	const shouldPlay = $derived(mounted && inView && !userPaused);

	onMount(() => {
		small = window.matchMedia('(max-width: 900px)').matches;
		const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
			?.saveData;
		// Motion-sensitive and data-saving visitors get the poster and a play button.
		if (reducedMotion.current || saveData) userPaused = true;
		else wanted[0] = true;
		mounted = true;
	});

	const clipSrc = (i: number) => `${clips[i].base}/clip${small ? '-720' : ''}.mp4`;

	// A reel scrolled out of view stops decoding; it picks up again on return.
	const watch: Attachment<HTMLElement> = (node) => {
		const io = new IntersectionObserver(([entry]) => (inView = entry.isIntersecting), {
			threshold: 0.1
		});
		io.observe(node);
		return () => io.disconnect();
	};

	/** Starts clip `i` if it is the one on screen and the reel should be running. */
	function start(i: number) {
		const video = videos[i];
		if (!video || !shouldPlay || i !== active || !wanted[i]) return;
		video.play().catch((err: DOMException) => {
			// Autoplay refused (Low Power Mode, browser policy): fall back to the
			// poster and let the visitor start it. An AbortError only means a fresh
			// src interrupted the call; `canplay` will try again.
			if (err.name === 'NotAllowedError') userPaused = true;
		});
	}

	$effect(() => {
		videos.forEach((video, i) => {
			if (!video) return;
			if (!shouldPlay) video.pause();
			else start(i);
		});
	});

	function go(next: number) {
		if (next === active) return;
		const previous = active;
		wanted[next] = true;
		const incoming = videos[next];
		if (incoming) incoming.currentTime = 0;
		active = next;
		progress = 0;
		// The outgoing clip keeps running under the dissolve, then rests.
		setTimeout(() => {
			if (active !== previous) videos[previous]?.pause();
		}, FADE * 1000);
	}

	function onTime(i: number, video: HTMLVideoElement) {
		if (i !== active || !video.duration) return;
		progress = video.currentTime / video.duration;
		const next = (i + 1) % clips.length;
		if (progress > 0.35) wanted[next] = true;
		if (video.duration - video.currentTime <= FADE) go(next);
	}

	function togglePlay() {
		userPaused = !userPaused;
		if (!userPaused) wanted[active] = true;
	}
</script>

<section class="relative z-[2] w-full px-2 pt-2 md:px-4 md:pt-3">
	<div
		{@attach watch}
		class="relative isolate flex min-h-[calc(100svh-6rem)] flex-col overflow-hidden rounded-[1.75rem] bg-brand-deep shadow-2xl shadow-brand/25 md:rounded-[2.5rem] lg:min-h-[min(calc(100svh-6.5rem),60rem)]"
	>
		<!-- ============ BACKGROUND REEL ============ -->
		<div class="absolute inset-0 -z-10" role="img" aria-label={m.hero_video_label()}>
			{#each clips as clip, i (clip.key)}
				<div
					class="absolute inset-0 transition-[opacity,transform] ease-out motion-reduce:transition-none {active ===
					i
						? 'scale-100 opacity-100'
						: 'scale-[1.06] opacity-0'}"
					style:transition-duration="{FADE}s, {active === i ? 14 : FADE}s"
				>
					<img
						src="{clip.base}/poster.jpg"
						alt=""
						class="absolute inset-0 h-full w-full object-cover"
						loading={i === 0 ? 'eager' : 'lazy'}
						fetchpriority={i === 0 ? 'high' : 'auto'}
						decoding="async"
					/>
					<video
						bind:this={videos[i]}
						src={wanted[i] ? clipSrc(i) : undefined}
						class="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 {ready[
							i
						]
							? 'opacity-100'
							: 'opacity-0'}"
						muted
						playsinline
						preload="auto"
						disablepictureinpicture
						disableremoteplayback
						aria-hidden="true"
						tabindex="-1"
						oncanplay={() => start(i)}
						onplaying={() => (ready[i] = true)}
						ontimeupdate={(e) => onTime(i, e.currentTarget)}
						onended={() => i === active && go((i + 1) % clips.length)}
					></video>
				</div>
			{/each}
		</div>

		<!-- Legibility: a navy wash pooled behind the centred copy, a light floor for
		     the stats (kept light so the logo in the clips' corner still reads), and a
		     little grain so the footage reads as film, not compression. -->
		<div
			class="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_65%_at_50%_48%,rgba(7,16,34,.8)_0%,rgba(7,16,34,.55)_50%,rgba(7,16,34,.3)_100%)]"
		></div>
		<div
			class="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[40%] bg-linear-to-t from-[#060e1f]/70 via-[#060e1f]/30 to-transparent"
		></div>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-linear-to-b from-black/35 to-transparent"
		></div>
		<div class="hero-grain pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"></div>
		<div
			class="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset"
		></div>

		<!-- ============ CONTENT ============ -->
		<div
			class="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-6 pt-16 pb-6 md:px-12 md:pt-24 md:pb-8"
		>
			<!-- my-auto centres the copy in whatever height the stats strip leaves. -->
			<div class="mx-auto my-auto flex max-w-[62rem] flex-col items-center text-center">
				<!-- Eyebrow -->
				<div
					class="inline-flex animate-ds-up items-center gap-2.5 rounded-full border border-white/15 bg-white/10 py-1.5 pr-4 pl-2 backdrop-blur-md [animation-delay:50ms]"
				>
					<span class="relative flex size-2.5 items-center justify-center">
						<span
							class="absolute inline-flex size-full animate-ping rounded-full bg-brand-red/70 motion-reduce:animate-none"
						></span>
						<span class="relative inline-flex size-2 rounded-full bg-brand-red"></span>
					</span>
					<span class="text-[12.5px] font-semibold tracking-[0.02em] text-white/90">
						{m.badge_text()}
					</span>
				</div>

				<!-- Heading -->
				<h1
					class="mt-6 max-w-[18ch] animate-ds-up font-heading text-[clamp(2.5rem,5.4vw,5.25rem)] leading-[0.98] font-extrabold tracking-[-0.035em] text-balance text-white [animation-delay:120ms]"
				>
					<span
						class="bg-linear-to-r from-white via-[#d6e5ff] to-[#8db7ff] bg-clip-text text-transparent"
					>
						{m.hero_title_highlight()}
					</span>
					{m.hero_title_rest()}
				</h1>

				<!-- Subtitle -->
				<p
					class="mt-5 max-w-[58ch] animate-ds-up text-[16.5px] leading-relaxed text-white/75 [animation-delay:200ms] md:text-[18px]"
				>
					{m.hero_subtitle()}
				</p>

				<!-- Actions + trust -->
				<div
					class="mt-8 flex animate-ds-up flex-wrap items-center justify-center gap-x-4 gap-y-5 [animation-delay:280ms]"
				>
					<a
						href={quoteUrl}
						class="group inline-flex items-center gap-3.5 rounded-full bg-white py-2 pr-2 pl-7 text-[15px] font-bold text-brand-deep shadow-xl shadow-black/25 transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0"
					>
						{m.btn_quote()}
						<span
							class="flex size-10 items-center justify-center rounded-full bg-linear-to-br from-brand-bright to-brand"
						>
							<ArrowRight
								class="size-4.5 text-white transition-transform group-hover:translate-x-0.5"
							/>
						</span>
					</a>

					<a
						href={watchUrl}
						class="inline-flex items-center gap-2.5 rounded-full border border-white/25 bg-white/5 px-6 py-3.5 text-[15px] font-bold text-white backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:bg-white/15 active:translate-y-0"
					>
						<span class="flex size-6 items-center justify-center rounded-full bg-brand-red">
							<Play class="size-2.5 fill-white text-white" />
						</span>
						{m.hero_btn_watch()}
					</a>

					<div class="flex items-center gap-3.5 sm:ml-3 sm:border-l sm:border-white/15 sm:pl-6">
						<div class="flex">
							<div
								class="size-9 rounded-full bg-gradient-to-br from-brand-bright to-brand ring-2 ring-[#0b1830]"
							></div>
							<div
								class="-ml-3 size-9 rounded-full bg-gradient-to-br from-brand-red to-[#a51f18] ring-2 ring-[#0b1830]"
							></div>
							<div
								class="-ml-3 size-9 rounded-full bg-gradient-to-br from-brand-green to-[#2f6e39] ring-2 ring-[#0b1830]"
							></div>
						</div>
						<div class="text-left leading-tight">
							<div class="text-[14.5px] font-extrabold text-white">{trustCount}</div>
							<div class="text-[12.5px] font-semibold text-white/60">{trustSub}</div>
						</div>
					</div>
				</div>
			</div>

			<!-- ============ FOOTER STRIP ============ -->
			<div
				class="mt-10 animate-ds-up border-t border-white/15 pt-6 [animation-delay:380ms] lg:mt-12"
			>
				<ul
					class="grid grid-cols-2 gap-x-6 gap-y-4 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-10"
				>
					{#each stats as stat (stat.label)}
						<li class="flex items-center gap-2.5">
							<span
								class="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15"
							>
								<stat.icon class="size-4 text-white" />
							</span>
							<span class="text-[13.5px] leading-tight font-semibold text-white/80">
								{stat.label()}
							</span>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Reel controls: a segment per clip (played ones full, the current one
			     filling), the current clip's name, and a pause for anyone who wants the
			     motion to stop (WCAG 2.2.2). In the flow on phones, up in the top corner
			     from tablets on, where they don't crowd the stats. -->
			<div
				class="mx-auto mt-7 flex w-full max-w-xs items-center gap-4 md:absolute md:top-8 md:right-8 md:mt-0 md:w-72 lg:top-10 lg:right-10"
			>
				<div class="min-w-0 flex-1">
					<p class="flex items-baseline gap-2 text-[12px]" aria-live="polite">
						<span class="font-grotesk font-bold text-white tabular-nums">
							{String(active + 1).padStart(2, '0')}<span class="text-white/45"
								>/{String(clips.length).padStart(2, '0')}</span
							>
						</span>
						<span class="truncate font-semibold text-white/85">{clips[active].title()}</span>
					</p>
					<div class="mt-1 flex gap-1.5">
						{#each clips as clip, i (clip.key)}
							<button
								type="button"
								onclick={() => go(i)}
								aria-label={m.hero_video_show({ name: clip.title() })}
								aria-current={active === i}
								class="group flex h-5 flex-1 items-center focus-visible:outline-none"
							>
								<span
									class="block h-0.5 w-full overflow-hidden rounded-full bg-white/25 transition-[height] group-hover:h-1 group-focus-visible:ring-2 group-focus-visible:ring-white"
								>
									<span
										class="block h-full origin-left bg-white transition-transform duration-300 ease-linear"
										style:transform="scaleX({i < active ? 1 : i === active ? progress : 0})"
									></span>
								</span>
							</button>
						{/each}
					</div>
				</div>

				<button
					type="button"
					onclick={togglePlay}
					aria-label={userPaused ? m.hero_video_play() : m.hero_video_pause()}
					class="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
				>
					{#if userPaused}
						<Play class="size-4 fill-white" />
					{:else}
						<Pause class="size-4 fill-white" />
					{/if}
				</button>
			</div>
		</div>
	</div>
</section>

<style>
	/* Fine film grain over the footage, fixed SVG noise so it costs one tiny paint. */
	.hero-grain {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
		mix-blend-mode: overlay;
	}
</style>
