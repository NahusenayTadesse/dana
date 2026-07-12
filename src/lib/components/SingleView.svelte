<script lang="ts">
	let { title, children, class: className = '', photo = '' } = $props();
</script>

<div
	class="w-full overflow-hidden rounded-2xl border border-border/60
         bg-card shadow-sm lg:w-auto lg:min-w-3xl {className}"
>
	<!-- Hero band -->
	<div
		class="relative flex w-full flex-col items-center gap-3.5
           overflow-hidden bg-[linear-gradient(135deg,hsl(240_6%_10%),hsl(240_3%_28%))] px-8
           py-8"
	>
		<!-- Subtle noise texture -->
		<div
			class="pointer-events-none absolute inset-0 opacity-[0.03]"
			style="background-image: url('data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E'); background-size: 200px;"
		></div>

		<!-- Soft glow behind content -->
		<div
			class="pointer-events-none absolute -bottom-10 left-1/2 h-20 w-64
             -translate-x-1/2 rounded-full
             bg-primary/10 blur-3xl"
		></div>

		<!-- Avatar (conditional) -->
		{#if photo !== ''}
			<div class="relative z-10">
				<!-- Gradient ring -->
				<div
					class="absolute -inset-[3px] rounded-full
                 bg-[linear-gradient(135deg,hsl(240_60%_70%/0.5),transparent_60%)]"
				></div>
				<img
					src="/files/{photo}"
					loading="lazy"
					alt="{title} photo"
					class="relative z-10 block h-22 w-22 rounded-full
                 border-2 border-white/10 object-cover"
				/>
			</div>
		{/if}

		<!-- Title -->
		<h1
			class="relative z-10 text-center text-lg leading-snug font-medium
             tracking-tight text-white/90"
		>
			{title}
		</h1>
	</div>

	<!-- Body slot -->
	<div class="flex flex-col gap-3 p-6">
		{@render children()}
	</div>
</div>
