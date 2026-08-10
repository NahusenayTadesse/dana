<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { MarkRead as schema } from './schema';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { CircleCheckBig } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { data, id }: { data: SuperValidated<schema>; id: number } = $props();

	const { form, enhance, delayed, message } = superForm(data, { resetForm: false });

	$effect(() => {
		if ($message) {
			$message.type === 'error' ? toast.error($message.text) : toast.success($message.text);
		}
	});

	$form.id = id;
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