<script lang="ts">
	import { ShieldCheck, Repeat2, UserCheck, Truck, Handshake, GraduationCap } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	const reasons = [
		{ icon: ShieldCheck, title: m.why_1_title, text: m.why_1_text },
		{ icon: Repeat2, title: m.why_2_title, text: m.why_2_text },
		{ icon: UserCheck, title: m.why_3_title, text: m.why_3_text },
		{ icon: Truck, title: m.why_4_title, text: m.why_4_text },
		{ icon: Handshake, title: m.why_5_title, text: m.why_5_text },
		{ icon: GraduationCap, title: m.why_6_title, text: m.why_6_text }
	];
</script>

<section class="relative z-[2] mx-auto max-w-[1280px] px-6 py-16 md:px-8">
	<div class="mx-auto max-w-[720px] text-center">
		<p class="text-[13px] font-extrabold tracking-[0.16em] text-brand uppercase">
			{m.why_eyebrow()}
		</p>

		<h2
			class="mt-3.5 font-heading text-[clamp(1.75rem,3vw,2.75rem)] leading-[1.08] font-extrabold tracking-[-0.02em] text-balance text-foreground"
		>
			{m.why_title()}
		</h2>

		<p class="mt-4 text-[16.5px] leading-relaxed text-muted-foreground">
			{m.why_intro()}
		</p>
	</div>

	<div class="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
		{#each reasons as reason (reason.title)}
			<div
				class="group rounded-[1.5rem] bg-card p-7 shadow-lg ring-1 shadow-brand/8 ring-brand/5 transition-transform duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-brand/15"
			>
				<span
					class="flex size-13 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-bright to-brand shadow-lg shadow-brand/30 transition-transform duration-300 group-hover:scale-105"
				>
					<reason.icon class="size-6 text-white" />
				</span>

				<h3 class="mt-5 font-heading text-[19px] font-extrabold tracking-[-0.01em] text-foreground">
					{reason.title()}
				</h3>

				<p class="mt-2.5 text-[15px] leading-relaxed text-muted-foreground">
					{reason.text()}
				</p>
			</div>
		{/each}
	</div>
</section>
