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
	import { UNIT_ITEMS } from './units';
	import type { EditMaterial } from './schema';
	import type { MaterialRow } from './types';

	let {
		data,
		row,
		suppliers,
		icon = false
	}: {
		data: SuperValidated<EditMaterial>;
		row: MaterialRow;
		suppliers: { value: number; name: string }[];
		icon?: boolean;
	} = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `material-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.name = row.name;
		$form.supplierId = row.supplierId;
		$form.unit = row.unit;
		$form.quantityOnHand = row.quantityOnHand;
		$form.reorderLevel = row.reorderLevel;
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
	<form action="?/edit" method="post" use:enhance id="mat-edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />
		<InputComp {form} {errors} label="Material" type="text" name="name" required={true} />
		<InputComp {form} {errors} label="Supplier" type="select" name="supplierId" items={suppliers} />
		<InputComp {form} {errors} label="Unit" type="select" name="unit" items={UNIT_ITEMS} />
		<InputComp {form} {errors} label="Quantity on hand" type="number" name="quantityOnHand" min="0" />
		<InputComp
			{form}
			{errors}
			label="Reorder level"
			type="number"
			name="reorderLevel"
			min="0"
			placeholder="Leave blank for no alert"
		/>
		<InputComp
			{form}
			{errors}
			label="In use"
			type="checkboxSingle"
			name="isActive"
			placeholder="Uncheck to retire a material you no longer buy"
		/>

		<Button type="submit" class="mt-2" form="mat-edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
