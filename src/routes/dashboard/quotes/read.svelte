<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { MarkRead as schema } from './schema';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { CircleCheckBig } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';

	let { data, id }: { data: SuperValidated<schema>; id: number } = $props();

	// Per-row id: Read and Delete schemas are identical, so without one they all
	// shared an id and a "Mark as read" result retargeted another row's Delete.
	const { form, enhance, delayed, message } = untrack(() =>
		superForm(data, { id: `quote-read-${id}`, resetForm: false })
	);

	$effect(() => {
		if ($message) {
			$message.type === 'error' ? toast.error($message.text) : toast.success($message.text);
		}
	});

	untrack(() => {
		$form.id = id;
	});
</script>

<form method="post" action="?/read" use:enhance class="flex items-start">
	<Button type="submit" size="sm" variant="outline">
		{#if $delayed}
			<LoadingBtn name="Marking..." />
		{:else}
			<CircleCheckBig class="size-3.5" /> Mark as Read
		{/if}
	</Button>
	<input bind:value={$form.id} name="id" type="hidden" />
</form>