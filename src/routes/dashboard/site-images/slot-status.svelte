<script lang="ts">
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { isCustom = false }: { isCustom?: boolean } = $props();
</script>

{#if isCustom}
	<Badge>Customised</Badge>
{:else}
	<Badge variant="outline" class="text-muted-foreground">Default</Badge>
{/if}
