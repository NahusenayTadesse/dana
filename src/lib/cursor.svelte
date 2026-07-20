<script lang="ts">
	import { onMount } from 'svelte';
	import { initPremiumCursor } from '$lib/hooks/utils';

	onMount(() => {
		initPremiumCursor();
	});
</script>