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
	import type { EditStock } from './schema';
	import type { StockRow } from './types';

	let {
		data,
		row,
		variants,
		warehouses,
		icon = false
	}: {
		data: SuperValidated<EditStock>;
		row: StockRow;
		variants: { value: number; name: string }[];
		warehouses: { value: number; name: string }[];
		icon?: boolean;
	} = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `stock-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.variantId = row.variantId;
		$form.warehouseId = row.warehouseId;
		$form.quantity = row.quantity;
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
	title={icon ? 'Edit' : row.variantName}
	IconComp={icon ? SquarePen : undefined}
	variant="ghost"
	size="lg"
>
	<form action="?/edit" method="post" use:enhance id="stock-edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />
		<InputComp {form} {errors} label="Product" type="combo" name="variantId" items={variants} />
		<InputComp
			{form}
			{errors}
			label="Warehouse"
			type="select"
			name="warehouseId"
			items={warehouses}
		/>
		<InputComp {form} {errors} label="Quantity" type="number" name="quantity" min="0" />

		<Button type="submit" class="mt-2" form="stock-edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
