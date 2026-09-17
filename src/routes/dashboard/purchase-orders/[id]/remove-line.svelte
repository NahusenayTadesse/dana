<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { LineRow } from '../types';

	let { data, row }: { data: SuperValidated<any>; row: LineRow } = $props();

	const { form, enhance, message } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `poline-del-${row.id}` })
	);

	// With dataType 'json' superforms posts $form and ignores plain inputs, so
	// the line id has to be in the form store, not just a hidden input.
	untrack(() => {
		$form.id = row.id;
	});

	let confirming = $state(false);

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') toast.error($message.text);
		else toast.success($message.text);
	});
</script>

<form action="?/removeLine" method="post" use:enhance>
	{#if confirming}
		<Button type="submit" variant="destructive" size="sm">Remove?</Button>
	{:else}
		<Button type="button" variant="ghost" size="icon" title="Remove" onclick={() => (confirming = true)}>
			<Trash2 class="h-4 w-4 text-destructive" />
		</Button>
	{/if}
</form>
