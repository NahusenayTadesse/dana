<script>
	import Button from '$lib/components/ui/button/button.svelte';
	import { Sheet } from '@lucide/svelte';
	let { children } = $props();
</script>

<div class="mb-8 flex flex-row items-center justify-start gap-2">
	<Button href="/dashboard/customers"><Sheet /> All Customers</Button>
</div>

{@render children?.()}
