<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Save, SquarePen } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import OrderFields from './order-fields.svelte';
	import type { EditOrder } from './schema';
	import type { OrderRow } from './types';

	let {
		data,
		row,
		suppliers,
		people,
		icon = false
	}: {
		data: SuperValidated<EditOrder>;
		row: OrderRow;
		suppliers: { value: number; name: string }[];
		people: { value: number; name: string }[];
		icon?: boolean;
	} = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `po-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.supplierId = row.supplierId;
		$form.status = row.status;
		$form.expectedDate = row.expectedDate;
		$form.receivedDate = row.receivedDate;
		$form.raisedBy = row.raisedBy;
		$form.notes = row.notes ?? '';
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
	title={icon ? 'Edit' : `PO-${row.id}`}
	IconComp={icon ? SquarePen : undefined}
	variant="ghost"
	size="md"
>
	<form action="?/edit" method="post" use:enhance id="po-edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />
		<OrderFields {form} {errors} {suppliers} {people} />

		<Button type="submit" class="mt-2" form="po-edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
