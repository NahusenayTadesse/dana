<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Save, SquarePen } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import type { EditWarehouse } from './schema';
	import type { WarehouseRow } from './types';

	let {
		data,
		row,
		icon = false
	}: { data: SuperValidated<EditWarehouse>; row: WarehouseRow; icon?: boolean } = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `warehouse-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.name = row.name;
		$form.location = row.location ?? '';
		$form.isDefault = row.isDefault;
		$form.isActive = row.isActive;
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

<DialogComp
	bind:open
	title={icon ? 'Edit' : row.name}
	IconComp={icon ? SquarePen : undefined}
	variant="ghost"
	size="md"
>
	<form action="?/edit" method="post" use:enhance id="wh-edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />
		<InputComp {form} {errors} label="Name" type="text" name="name" required={true} />
		<InputComp
			{form}
			{errors}
			label="Location"
			type="text"
			name="location"
			placeholder="Adama factory yard"
		/>
		<InputComp
			{form}
			{errors}
			label="Default"
			type="checkboxSingle"
			name="isDefault"
			placeholder="Where stock lands unless another is picked"
		/>
		<InputComp
			{form}
			{errors}
			label="In use"
			type="checkboxSingle"
			name="isActive"
			placeholder="Uncheck to retire it without losing its stock history"
		/>

		<Button type="submit" class="mt-2" form="wh-edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
