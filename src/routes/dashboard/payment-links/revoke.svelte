<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Ban } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { LinkRow } from './types';

	let { data, row }: { data: SuperValidated<any>; row: LinkRow } = $props();

	const { enhance, message } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `link-revoke-${row.id}` })
	);

	let confirming = $state(false);

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') toast.error($message.text);
		else toast.success($message.text);
	});
</script>

{#if row.state === 'live'}
	<form action="?/revoke" method="post" use:enhance>
		<input type="hidden" name="id" value={row.id} />
		{#if confirming}
			<Button type="submit" variant="destructive" size="sm">Revoke?</Button>
		{:else}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				title="Revoke this link"
				onclick={() => (confirming = true)}
			>
				<Ban class="h-4 w-4 text-destructive" />
			</Button>
		{/if}
	</form>
{:else}
	<span class="text-xs text-muted-foreground">—</span>
{/if}
