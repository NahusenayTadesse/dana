<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	let { image = '/assets/factory-gate.jpg' } = $props();

	const stats = [
		{ value: m.factory_stat1_value, label: m.factory_stat1_label },
		{ value: m.factory_stat2_value, label: m.factory_stat2_label },
		{ value: m.factory_stat3_value, label: m.factory_stat3_label }
	];
</script>

<section class="relative z-1 mx-auto max-w-[1280px] px-6 py-16 md:px-8">
	<div
		class="relative flex min-h-[420px] items-end overflow-hidden rounded-[2rem] bg-cover bg-center md:min-h-[440px]"
		style="background-image:url('{image}')"
	>
		<!-- Fixed dark wash so the copy stays legible in both themes -->
		<div
			class="absolute inset-0 bg-[linear-gradient(90deg,rgba(12,27,52,.92)_0%,rgba(18,58,130,.6)_55%,rgba(18,58,130,.15)_100%)]"
		></div>

		<div class="relative max-w-[660px] p-8 text-white md:p-12">
			<h2
				class="font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em]"
			>
				{m.factory_title()}
			</h2>
			<p class="mt-4 text-[16.5px] leading-relaxed text-[#D6E2F5]">
				{m.factory_description()}
			</p>

			<div
				class="mt-9 flex flex-wrap rounded-[18px] border border-white/15 bg-white/10 px-2 py-5 backdrop-blur"
			>
				{#each stats as stat, i (i)}
					<div
						class="flex-1 border-white/15 px-4 text-center md:px-5 {i < stats.length - 1
							? 'border-r'
							: ''}"
					>
						<div class="font-grotesk text-[clamp(1.9rem,4vw,2.4rem)] leading-none font-extrabold">
							{stat.value()}
						</div>
						<div class="mt-1.5 text-[13px] font-semibold text-[#B9CCEC]">{stat.label()}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</section>
