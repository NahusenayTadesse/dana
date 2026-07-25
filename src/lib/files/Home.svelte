<script lang="ts">
	import type { Snippet } from 'svelte';
	import Marquee from './Marquee.svelte';
	import RalShowcase from './RalShowcase.svelte';
	import FactoryBand from './FactoryBand.svelte';
	import Testimonials from './Testimonials.svelte';
	import Cta from './Cta.svelte';

	type Testimonial = {
		id: number;
		name: string;
		position: string | null;
		message: string;
		avatar: string | null;
	};

	let {
		children,
		testimonials = [] as Testimonial[]
	}: { children?: Snippet; testimonials?: Testimonial[] } = $props();
</script>

<Marquee />

<!-- Our Products section is injected here as children -->
{#if children}
	{@render children()}
{/if}

<RalShowcase />
<FactoryBand />
<Testimonials {testimonials} />
<Cta />
