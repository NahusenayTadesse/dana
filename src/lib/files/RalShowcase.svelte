<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	let { image = '/images/manufacture.webp' } = $props();

	// RAL codes carry fixed brand-neutral colors (kept as literals on purpose)
	const swatches = [
		{ code: 'RAL 3000', color: '#E5342A' },
		{ code: 'RAL 6002', color: '#2C7D3E' },
		{ code: 'RAL 5010', color: '#1E52A8' },
		{ code: 'RAL 1004', color: '#D9A441' }
	];
</script>

<style>
	.ds-dots {
		background-image: radial-gradient(rgba(255, 255, 255, 0.9) 1.3px, transparent 1.3px);
		background-size: 24px 24px;
	}
</style>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 pt-22 md:px-8">
	<!-- Always-dark feature band (fixed navy so it reads the same in light + dark) -->
	<div
		class="relative overflow-hidden rounded-[2rem] bg-[linear-gradient(135deg,#0C1B34,#123A82)] p-8 text-white md:p-14"
	>
		<div class="ds-dots pointer-events-none absolute inset-0 opacity-10"></div>

		<div class="relative grid items-center gap-11 md:grid-cols-2">
			<div>
				<p class="text-[13px] font-extrabold tracking-[0.16em] text-[#7FA6FF] uppercase">
					{m.ral_eyebrow()}
				</p>
				<h2
					class="mt-3.5 font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em]"
				>
					{m.ral_title()}
				</h2>
				<p class="mt-4 max-w-[44ch] text-[16.5px] leading-relaxed text-[#C6D6F0]">
					{m.ral_description()}
				</p>

				<div class="mt-7 flex flex-wrap gap-3">
					{#each swatches as s (s.code)}
						<span
							class="inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[13.5px] font-bold"
						>
							<span class="size-3.5 rounded-full" style="background:{s.color}"></span>
							{s.code}
						</span>
					{/each}
				</div>
			</div>

			<div
				class="h-72 rounded-3xl bg-cover bg-center shadow-2xl shadow-black/30 md:h-80"
				style="background-image:url('{image}')"
				role="img"
				aria-label={m.ral_title()}
			></div>
		</div>
	</div>
</section>
