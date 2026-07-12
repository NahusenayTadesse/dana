<script lang="ts">
	import { Info } from '@lucide/svelte';
	import {
		TooltipProvider,
		Tooltip,
		TooltipContent,
		TooltipTrigger
	} from '$lib/components/ui/tooltip';

	let {
		discountName,
		discountDescription
	}: { discountName: string | undefined; discountDescription: string | undefined } = $props();
</script>

{#if discountName}
	<TooltipProvider>
		<Tooltip>
			<TooltipTrigger>
				{#snippet child({ props })}
					<div class="flex items-center gap-2" {...props}>
						<span class="font-medium">{discountName}</span>
						{#if discountDescription}
							<Info class="size-4 text-muted-foreground" />
						{/if}
					</div>
				{/snippet}
			</TooltipTrigger>
			{#if discountDescription}
				<TooltipContent>
					<p>{discountDescription}</p>
				</TooltipContent>
			{/if}
		</Tooltip>
	</TooltipProvider>
{:else}
	<span class="text-muted-foreground">—</span>
{/if}
