<script lang="ts">
	import { Globe } from '@lucide/svelte';

	let {
		status = 'pending',
		online = false
	}: { status?: string | null; online?: boolean } = $props();

	const styles: Record<string, string> = {
		paid: 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400',
		pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
		unpaid: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400',
		partially_paid: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
		overpaid: 'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
		refunded: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
		partially_refunded: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
		disputed: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400'
	};

	const label = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
</script>

{#if !status}
	<span class="text-sm text-muted-foreground">—</span>
{:else}
	<span
		class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium {styles[
			status
		] ?? 'bg-slate-100 text-slate-600'}"
	>
		{label(status)}
		{#if online}
			<Globe class="h-3 w-3" title="Paid via Chapa" aria-label="Paid via gateway" />
		{/if}
	</span>
{/if}