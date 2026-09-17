<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { MarkRead as schema } from './schema';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { CircleCheckBig } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let {
		data,
		id
	}: {
		data: SuperValidated<schema>;
		id: number;
	} = $props();

	// Per-row superForm id, and no shared `id="read"` / `form="read"` pair: every
	// button pointed at the FIRST form with that DOM id, so "Mark as Read" on any
	// row marked the first unread message.
	const { form, enhance, delayed, message } = untrack(() =>
		superForm(data, { id: `message-read-${id}`, resetForm: false })
	);

	untrack(() => {
		$form.id = id;
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
</script>

<form method="post" class="-mt-4 flex h-full flex-col items-start justify-start" action="?/read" use:enhance>
	<Button type="submit" size="sm" variant="outline" class="mt-4">
		{#if $delayed}
			<LoadingBtn name="Marking as Read" />
		{:else}
			<CircleCheckBig /> Mark as Read
		{/if}
	</Button>
	<input bind:value={$form.id} name="id" type="hidden" />
</form>
