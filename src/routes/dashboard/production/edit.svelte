<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Save, SquarePen } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import Fields from './fields.svelte';
	import type { EditBatch } from './schema';
	import type { BatchRow } from './types';

	let {
		data,
		row,
		variants,
		materials,
		people,
		warehouses,
		icon = false
	}: {
		data: SuperValidated<EditBatch>;
		row: BatchRow;
		variants: { value: number; name: string }[];
		materials: { value: number; name: string }[];
		people: { value: number; name: string }[];
		warehouses: { value: number; name: string }[];
		icon?: boolean;
	} = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `batch-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.batchNumber = row.batchNumber;
		$form.variantId = row.variantId;
		$form.rawMaterialId = row.rawMaterialId;
		$form.rawMaterialConsumed = row.rawMaterialConsumed;
		$form.quantityProduced = row.quantityProduced;
		$form.scrapQuantity = row.scrapQuantity;
		$form.producedBy = row.producedBy;
		$form.warehouseId = row.warehouseId;
		$form.productionDate = row.productionDate;
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
	title={icon ? 'Edit' : row.batchNumber}
	IconComp={icon ? SquarePen : undefined}
	variant="ghost"
	size="lg"
>
	<form action="?/edit" method="post" use:enhance id="batch-edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />
		<Fields {form} {errors} {variants} {materials} {people} {warehouses} />

		<Button type="submit" class="mt-2" form="batch-edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
