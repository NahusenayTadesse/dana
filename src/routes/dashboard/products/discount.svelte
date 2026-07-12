<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { PercentIcon } from '@lucide/svelte';

	let { discount } = $props();
	const getDiscountVariant = (discount: number): 'default' | 'secondary' | 'destructive' => {
		if (discount >= 30) return 'destructive';
		if (discount >= 20) return 'default';
		return 'secondary';
	};
</script>

{#if discount !== null}
	<Badge variant={getDiscountVariant(Number(discount))} class="gap-1">
		<PercentIcon class="size-3" />
		{discount}% OFF
	</Badge>
{:else}
	<span class="text-sm text-muted-foreground">No discount</span>
{/if}
