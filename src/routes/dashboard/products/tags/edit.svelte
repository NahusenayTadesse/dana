<script lang="ts">
	import { untrack } from 'svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Edit } from './schema';

	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

	let {
		data,
		action = '?/edit',
		id,
		name
	}: {
		data: SuperValidated<Edit>;
		action?: string;
		id: number;
		name: string;
	} = $props();

	let open = $state(false);

	// One instance per row, each with its own id — a shared id sends every
	// action result to the first row's form.
	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, id: `tag-${id}` })
	);

	untrack(() => {
		$form.id = id;
		$form.name = name;
	});

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') {
			toast.error($message.text);
		} else {
			toast.success($message.text);
			open = false;
		}
	});
</script>

<DialogComp bind:open title="Edit" IconComp={SquarePen} variant="ghost">
	<form
		{action}
		use:enhance
		method="post"
		id="tag-edit-{id}"
		class="flex w-full flex-col gap-4 p-4"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<InputComp {form} {errors} label="name" type="text" name="name" required={true} />

		<Button type="submit" class="mt-4" form="tag-edit-{id}">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
