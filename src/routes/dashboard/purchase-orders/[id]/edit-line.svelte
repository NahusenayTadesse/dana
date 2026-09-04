<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Save, SquarePen } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import LineFields from './line-fields.svelte';
	import type { EditLine } from '../schema';
	import type { LineRow } from '../types';

	let {
		data,
		row,
		materials,
		variants,
		icon = false
	}: {
		data: SuperValidated<EditLine>;
		row: LineRow;
		materials: { value: number; name: string }[];
		variants: { value: number; name: string }[];
		icon?: boolean;
	} = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `poline-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.purchaseOrderId = row.purchaseOrderId;
		$form.rawMaterialId = row.rawMaterialId;
		$form.variantId = row.variantId;
		$form.quantity = row.quantity;
		$form.unitCost = row.unitCost;
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
	title={icon ? 'Edit' : row.itemName}
	IconComp={icon ? SquarePen : undefined}
	variant="ghost"
	size="lg"
>
	<form action="?/editLine" method="post" use:enhance id="poline-edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />
		<LineFields {form} {errors} {materials} {variants} />

		<Button type="submit" class="mt-2" form="poline-edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
