<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { StockRow } from './types';

	let { data, row }: { data: SuperValidated<any>; row: StockRow } = $props();

	const { enhance, message } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `stock-del-${row.id}` })
	);

	// Two taps rather than a browser confirm(): a dialog blocks the page, and a
	// stock line is cheap enough to re-add that a full confirmation sheet would
	// be more ceremony than the action deserves.
	let confirming = $state(false);

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') toast.error($message.text);
		else toast.success($message.text);
	});
</script>

<form action="?/remove" method="post" use:enhance>
	<input type="hidden" name="id" value={row.id} />
	{#if confirming}
		<Button type="submit" variant="destructive" size="sm">Remove?</Button>
	{:else}
		<Button type="button" variant="ghost" size="icon" title="Remove" onclick={() => (confirming = true)}>
			<Trash2 class="h-4 w-4 text-destructive" />
		</Button>
	{/if}
</form>
