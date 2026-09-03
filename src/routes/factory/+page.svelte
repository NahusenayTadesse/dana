<script>
	import { m } from '$lib/paraglide/messages.js';
	import { PaintRoller, Layers, House, Wrench, ArrowRight } from '@lucide/svelte';
	import { siteImage } from '$lib/siteImages.svelte';

	// Reveal-on-scroll: strips the hidden classes when the element enters view.
	function reveal(node, delay = 0) {
		node.style.transitionDelay = `${delay}ms`;
		const io = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (e.isIntersecting) {
						node.classList.remove('opacity-0', 'translate-y-5');
						io.unobserve(node);
					}
				}
			},
			{ threshold: 0.15 }
		);
		io.observe(node);
		return { destroy: () => io.disconnect() };
	}

	// Drag-to-pan the 360 background.
	function pano(node, start = 20) {
		let pos = start;
		let dragging = false;
		let lastX = 0;
		const apply = () => (node.style.backgroundPositionX = `${pos}%`);
		apply();
		const down = (e) => {
			dragging = true;
			lastX = e.touches ? e.touches[0].clientX : e.clientX;
			node.style.cursor = 'grabbing';
		};
		const move = (e) => {
			if (!dragging) return;
			const x = e.touches ? e.touches[0].clientX : e.clientX;
			pos = Math.min(100, Math.max(0, pos - (x - lastX) * 0.08));
			lastX = x;
			apply();
		};
		const up = () => {
			dragging = false;
			node.style.cursor = 'grab';
		};
		node.addEventListener('mousedown', down);
		node.addEventListener('touchstart', down, { passive: true });
		window.addEventListener('mousemove', move);
		window.addEventListener('touchmove', move, { passive: true });
		window.addEventListener('mouseup', up);
		window.addEventListener('touchend', up);
		return {
			destroy() {
				node.removeEventListener('mousedown', down);
				node.removeEventListener('touchstart', down);
				window.removeEventListener('mousemove', move);
				window.removeEventListener('touchmove', move);
				window.removeEventListener('mouseup', up);
				window.removeEventListener('touchend', up);
			}
		};
	}

	const factorySteps = [
		{ n: '01', title: m.step_1_title, desc: m.step_1_desc },
		{ n: '02', title: m.step_2_title, desc: m.step_2_desc },
		{ n: '03', title: m.step_3_title, desc: m.step_3_desc },
		{ n: '04', title: m.step_4_title, desc: m.step_4_desc },
		{ n: '05', title: m.step_5_title, desc: m.step_5_desc }
	];

	// Captions and layout are fixed; only the photos are admin-editable, so the
	// nth image in the `factory.machines` slot keeps the nth caption. The first
	// tile is the tall one.
	const machineTiles = [
		{ title: m.machine_1_title, sub: m.machine_1_sub, cls: 'md:row-span-2' },
		{ title: m.machine_2_title, sub: m.machine_2_sub, cls: '' },
		{ title: m.machine_3_title, sub: m.machine_3_sub, cls: '' },
		{ title: m.machine_4_title, sub: m.machine_4_sub, cls: '' },
		{ title: m.machine_5_title, sub: m.machine_5_sub, cls: '' }
	];

	const machines = $derived(
		machineTiles.map((tile, i) => ({ ...tile, img: siteImage('factory.machines', i) }))
	);

	const panoramaImage = $derived(siteImage('factory.panorama'));

	// The four product lines the company manufactures.
	const productLines = [
		{
			key: 'ppgi',
			icon: PaintRoller,
			title: m.factory_product_ppgi_title,
			desc: m.factory_product_ppgi_desc,
			apps: m.factory_product_ppgi_apps
		},
		{
			key: 'gi',
			icon: Layers,
			title: m.factory_product_gi_title,
			desc: m.factory_product_gi_desc,
			apps: m.factory_product_gi_apps
		},
		{
			key: 'tiles',
			icon: House,
			title: m.factory_product_tiles_title,
			desc: m.factory_product_tiles_desc,
			apps: m.factory_product_tiles_apps
		},
		{
			key: 'accessories',
			icon: Wrench,
			title: m.factory_product_accessories_title,
			desc: m.factory_product_accessories_desc,
			apps: m.factory_product_accessories_apps
		}
	];

	const stats = [
		{ v: m.stat_inspection_value, l: m.stat_inspection_label },
		{ v: m.stat_gauge_value, l: m.stat_gauge_label },
		{ v: m.stat_warranty_value, l: m.stat_warranty_label },
		{ v: m.stat_iso_value, l: m.stat_iso_label }
	];

	// reused hidden state for the reveal action
	const hidden = 'opacity-0 translate-y-5 transition-all duration-700 ease-out';
</script>

<main class="bg-background text-foreground">
	<!-- HERO -->
	<section class="mx-auto max-w-[1320px] px-7 pt-11 pb-8">
		<div class="mono mb-6 flex items-center gap-2 text-[13px] text-muted-foreground">
			<span class="cursor-pointer">{m.breadcrumb_home()}</span>
			<span>/</span>
			<span class="text-foreground/70">{m.breadcrumb_factory()}</span>
		</div>
		<div class="max-w-[720px]">
			<div class="mono mb-3.5 text-[12px] tracking-[0.26em] text-primary uppercase">
				{m.hero_eyebrow()}
			</div>
			<h1
				class="display text-[clamp(32px,4.4vw,58px)] leading-[1.03] font-black tracking-[-0.025em]"
			>
				{m.hero_title()}
			</h1>
			<p class="mt-[18px] text-[17px] leading-[1.65] text-muted-foreground">{m.hero_desc()}</p>

			<div class="mt-8 flex flex-wrap items-center gap-3">
				<a
					href="/quotes"
					class="group inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-[14.5px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition duration-300 hover:-translate-y-0.5"
				>
					{m.btn_quote()}
					<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
				</a>
				<a
					href="/shop"
					class="inline-flex items-center rounded-full border border-border bg-card px-6 py-3.5 text-[14.5px] font-bold transition duration-300 hover:-translate-y-0.5 hover:border-primary/40"
				>
					{m.btn_explore()}
				</a>
				<a
					href="/contact-us"
					class="inline-flex items-center rounded-full px-4 py-3.5 text-[14.5px] font-bold text-primary underline-offset-4 hover:underline"
				>
					{m.cta_button()}
				</a>
			</div>
		</div>
	</section>

	<!-- 360 VIEWER -->
	<section class="mx-auto max-w-[1320px] px-7">
		<div
			role="img"
			aria-label={m.pano_alt()}
			class="relative h-[600px] overflow-hidden rounded-3xl border border-border shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
		>
			<div
				use:pano={20}
				class="absolute inset-0 cursor-grab [touch-action:pan-y]"
				style="background-image:url('{panoramaImage}');background-size:auto 130%;background-position:20% center;background-repeat:no-repeat"
			></div>

			<!-- legibility vignette (fixed dark, sits over the photo) -->
			<div
				class="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60"
			></div>

			<!-- hotspots -->
			<div class="pointer-events-none absolute" style="left:26%;top:52%">
				<span class="relative block h-10 w-10 rounded-full border-2 border-primary bg-primary/30">
					<span class="absolute -inset-2 animate-ping rounded-full border-2 border-primary/50"
					></span>
					<span
						class="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
					></span>
				</span>
			</div>
			<div class="pointer-events-none absolute" style="left:62%;top:44%">
				<span
					class="relative block h-10 w-10 rounded-full border-2 border-destructive bg-destructive/30"
				>
					<span
						class="absolute -inset-2 animate-ping rounded-full border-2 border-destructive/50 [animation-delay:.6s]"
					></span>
					<span
						class="absolute top-1/2 left-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
					></span>
				</span>
			</div>

			<!-- hotspot label (dark glass panel over the photo) -->
			<div
				class="absolute max-w-[210px] rounded-xl border border-white/15 bg-black/70 px-[15px] py-[11px] backdrop-blur-md"
				style="left:26%;top:52%;transform:translate(30px,-56px)"
			>
				<div class="mono text-[10px] tracking-[0.14em] text-white/60 uppercase">
					{m.hotspot_station()}
				</div>
				<div class="mt-[3px] text-[14px] font-bold text-white">{m.hotspot_title()}</div>
				<div class="mt-[3px] text-[12px] leading-[1.45] text-white/60">{m.hotspot_desc()}</div>
			</div>

			<!-- controls -->
			<div
				class="absolute bottom-[22px] left-6 flex items-center gap-2.5 rounded-full border border-white/15 bg-black/60 py-2 pr-3.5 pl-2.5 backdrop-blur-md"
			>
				<span
					class="flex h-[26px] w-[26px] animate-spin items-center justify-center rounded-full border-[1.5px] border-dashed border-primary [animation-duration:8s]"
				>
					<span class="h-[5px] w-[5px] rounded-full bg-primary"></span>
				</span>
				<span class="mono text-[11px] tracking-[0.12em] text-white/80 uppercase"
					>{m.pano_control()}</span
				>
			</div>
			<div class="absolute right-6 bottom-[22px] flex gap-[9px]">
				<span
					class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[11px] border border-white/15 bg-black/60 text-white/80 backdrop-blur-md"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg
					>
				</span>
				<span
					class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-[11px] border border-white/15 bg-black/60 text-white/80 backdrop-blur-md"
				>
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						><path
							d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"
						/></svg
					>
				</span>
			</div>
		</div>

		<p class="mt-4 max-w-[680px] text-[13.5px] leading-[1.6] text-muted-foreground">
			{m.pano_caption()}
		</p>
	</section>

	<!-- PROCESS TIMELINE -->
	<section class="mx-auto max-w-[1320px] px-7 py-[90px]">
		<h2
			use:reveal
			class="{hidden} display mb-11 text-[clamp(26px,3.2vw,40px)] font-extrabold tracking-[-0.02em]"
		>
			{m.process_heading()}
		</h2>
		<div class="grid grid-cols-2 gap-4 md:grid-cols-5">
			{#each factorySteps as s, i (s.n)}
				<div use:reveal={i * 80} class={hidden}>
					<div class="mono text-[15px] font-black text-primary">{s.n}</div>
					<div
						class="mt-3 mb-[18px] h-[3px] rounded bg-gradient-to-r from-primary to-primary/10"
					></div>
					<h3 class="display text-[17px] font-bold">{s.title()}</h3>
					<p class="mt-2 text-[13px] leading-[1.55] text-muted-foreground">{s.desc()}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- MACHINE GALLERY -->
	<section class="border-y border-border bg-card">
		<div class="mx-auto max-w-[1320px] px-7 py-[90px]">
			<div use:reveal class="{hidden} mb-10">
				<div class="mono mb-3.5 text-[12px] tracking-[0.26em] text-primary uppercase">
					{m.gallery_eyebrow()}
				</div>
				<h2 class="display text-[clamp(26px,3.2vw,40px)] font-extrabold tracking-[-0.02em]">
					{m.gallery_heading()}
				</h2>
			</div>
			<div class="grid auto-rows-[230px] grid-cols-2 gap-4 md:grid-cols-[2fr_1fr_1fr]">
				{#each machines as mac, i (i)}
					<div
						use:reveal={i * 70}
						class="{hidden} {mac.cls} relative overflow-hidden rounded-2xl border border-border"
					>
						<img
							src={mac.img}
							alt={m.factory_gallery_alt({ title: mac.title() })}
							loading="lazy"
							class="h-full w-full object-cover"
						/>
						<div
							class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent"
						></div>
						<div class="absolute bottom-4 left-[18px]">
							<div class="text-[16px] font-bold text-white">{mac.title()}</div>
							<div class="mt-0.5 text-[12.5px] text-white/60">{mac.sub()}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>
	</section>

	<!-- PRODUCT LINES -->
	<section class="mx-auto max-w-[1320px] px-7 py-[90px]">
		<div use:reveal class="{hidden} mb-10 max-w-[760px]">
			<div class="mono mb-3.5 text-[12px] tracking-[0.26em] text-primary uppercase">
				{m.factory_products_eyebrow()}
			</div>
			<h2 class="display text-[clamp(26px,3.2vw,40px)] font-extrabold tracking-[-0.02em]">
				{m.factory_products_heading()}
			</h2>
			<p class="mt-[18px] text-[16px] leading-[1.7] text-muted-foreground">
				{m.factory_products_desc()}
			</p>
		</div>

		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each productLines as prod, i (prod.key)}
				<div
					use:reveal={i * 70}
					class="{hidden} flex flex-col rounded-2xl border border-border bg-card p-6"
				>
					<span
						class="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary"
					>
						<prod.icon class="size-6" />
					</span>
					<h3 class="display text-[17px] leading-snug font-bold">{prod.title()}</h3>
					<p class="mt-2.5 grow text-[13.5px] leading-[1.6] text-muted-foreground">{prod.desc()}</p>
					<div
						class="mono mt-5 border-t border-border pt-4 text-[11.5px] leading-[1.5] tracking-[0.08em] text-primary uppercase"
					>
						{prod.apps()}
					</div>
				</div>
			{/each}
		</div>

		<div use:reveal={280} class="{hidden} mt-4 grid gap-4 md:grid-cols-[1.2fr_1fr]">
			<div class="h-[260px] overflow-hidden rounded-2xl border border-border">
				<img
					src={siteImage('factory.products.photo')}
					alt={m.factory_products_photo_alt()}
					loading="lazy"
					class="h-full w-full object-cover"
				/>
			</div>
			<div class="flex flex-col justify-center rounded-2xl border border-border bg-card p-7">
				<div class="mono text-[11px] tracking-[0.2em] text-primary uppercase">
					{m.factory_spec_label()}
				</div>
				<p class="mt-3 text-[14.5px] leading-[1.7] text-muted-foreground">
					{m.factory_products_spec_note()}
				</p>
			</div>
		</div>
	</section>

	<!-- QC STATS -->
	<section class="mx-auto grid max-w-[1320px] items-center gap-14 px-7 py-[90px] md:grid-cols-2">
		<div use:reveal class={hidden}>
			<div class="mono mb-3.5 text-[12px] tracking-[0.26em] text-primary uppercase">
				{m.qc_eyebrow()}
			</div>
			<h2
				class="display text-[clamp(26px,3.2vw,40px)] leading-[1.08] font-extrabold tracking-[-0.02em]"
			>
				{m.qc_heading()}
			</h2>
			<p class="mt-[18px] text-[16px] leading-[1.7] text-muted-foreground">{m.qc_desc()}</p>
		</div>
		<div use:reveal={120} class="{hidden} grid grid-cols-2 gap-3.5">
			{#each stats as st (st.l)}
				<div class="rounded-2xl border border-border bg-card p-6">
					<div class="display text-[38px] font-black text-primary">{st.v()}</div>
					<div class="mt-1 text-[13px] text-muted-foreground">{st.l()}</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- CLOSING -->
	<section class="border-t border-border bg-card">
		<div class="mx-auto max-w-[1320px] px-7 py-[90px]">
			<div use:reveal class="{hidden} grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
				<div>
					<h2
						class="display text-[clamp(26px,3.2vw,40px)] leading-[1.08] font-extrabold tracking-[-0.02em]"
					>
						{m.factory_closing_heading()}
					</h2>
					<p class="mt-[18px] text-[16px] leading-[1.7] text-muted-foreground">
						{m.factory_closing_desc()}
					</p>
					<div class="mt-8 flex flex-wrap items-center gap-3">
						<a
							href="/quotes"
							class="group inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-3.5 text-[14.5px] font-bold text-primary-foreground shadow-lg shadow-primary/25 transition duration-300 hover:-translate-y-0.5"
						>
							{m.btn_quote()}
							<ArrowRight class="size-4 transition-transform group-hover:translate-x-0.5" />
						</a>
						<a
							href="/contact-us"
							class="inline-flex items-center rounded-full border border-border bg-background px-6 py-3.5 text-[14.5px] font-bold transition duration-300 hover:-translate-y-0.5 hover:border-primary/40"
						>
							{m.cta_button()}
						</a>
					</div>
				</div>

				<blockquote
					class="rounded-2xl border border-primary/20 bg-background p-7 text-[17px] leading-[1.55] font-semibold text-balance"
				>
					{m.factory_closing_line()}
				</blockquote>
			</div>
		</div>
	</section>
</main>

<style>
	/* only fonts live here — everything else is Tailwind / shadcn tokens */
	.display {
		font-family: 'Archivo', system-ui, sans-serif;
	}
	.mono {
		font-family: 'Space Mono', monospace;
	}
</style>
