<script lang="ts">
	import { onMount } from 'svelte';
	import { initCustomCursor } from '$lib/hooks/utils';

	onMount(() => {
		initCustomCursor();
	});
</script>