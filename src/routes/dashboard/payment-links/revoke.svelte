<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Ban } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { LinkRow } from './types';

	let { data, row }: { data: SuperValidated<any>; row: LinkRow } = $props();

	const { form, enhance, message } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `link-revoke-${row.id}` })
	);

	// dataType 'json' posts $form and ignores plain inputs, so the id has to live
	// in the form store — a hidden <input> alone sent id 0 and nothing was revoked.
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

{#if row.state === 'live'}
	<form action="?/revoke" method="post" use:enhance>
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
