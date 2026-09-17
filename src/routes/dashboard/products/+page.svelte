<script lang="ts">
	import { columns } from './columns';
	import { can } from '$lib/permissions';

	let { data } = $props();

	const canCreate = $derived(can(data.access, 'products.create'));
	// Row selection only feeds the discount dialog.
	const canDiscount = $derived(can(data.access, 'products.discounts'));
	const visibleColumns = $derived(
		canDiscount ? columns : columns.filter((column) => column.id !== 'select')
	);

	import DataTable from '$lib/components/Table/data-table.svelte';

	import { Frown, Plus, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';

	import type { Snapshot } from '@sveltejs/kit';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';

	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { schema } from './schema';
	import { superForm } from 'sveltekit-superforms/client';
	import { untrack } from 'svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	import InputComp from '$lib/formComponents/InputComp.svelte';

	const { form, errors, enhance, delayed, allErrors, capture, restore, message } = superForm(
		untrack(() => data.form),
		{
			taintedMessage: () => {
				return new Promise((resolve) => {
					resolve(window.confirm('Do you want to leave?\nChanges you made may not be saved.'));
				});
			},
			validators: zod4Client(schema),
			dataType: 'json',
			// A reset would put `ids` back to [] while the rows stay selected, and the
			// next save would fail with "Select at least one product".
			resetForm: false
		}
	);

	export const snapshot: Snapshot = { capture, restore };

	import { toast } from 'svelte-sonner';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let filteredList = $derived(data?.productList);

	let selected = $state<{ id: number }[]>([]);

	// With dataType 'json' only $form is posted, so the selection must be copied
	// in — including when it shrinks back to nothing.
	$effect(() => {
		$form.ids = selected.map((row) => row.id);
	});
</script>

<svelte:head>
	<title>Products List</title>
</svelte:head>

{#if data.productList.length === 0}
	<div class="flex h-96 w-full flex-col items-center justify-center lg:w-5xl">
		<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
			<Frown class="h-12 w-16  animate-bounce" />
			Products List is Empty
		</p>
		{#if canCreate}
			<Button href="/dashboard/products/add-products"><Plus />Add New Products</Button>
		{/if}
	</div>
{:else}
	{#if canDiscount && selected.length}
		<p class="my-4 text-sm">Selected Products: {selected.length}</p>

		<DialogComp title="Add Discount for Selected Products" variant="default" IconComp={Plus}>
			<form
				use:enhance
				action="?/addDiscount"
				id="main"
				class="flex flex-col gap-3"
				method="POST"
				enctype="multipart/form-data"
			>
				<Errors allErrors={$allErrors} />
				Selected Products: {$form.ids.length}

				<InputComp name="name" label="Discount Name" type="text" {form} {errors} />
				<InputComp
					name="description"
					label="Discount Description"
					type="textarea"
					{form}
					{errors}
				/>
				<InputComp
					name="amount"
					label="Discount Percentage (0 removes the discount)"
					type="number"
					min="0"
					max="100"
					{form}
					{errors}
				/>
				<Button type="submit" form="main" class="mt-4">
					{#if $delayed}
						<LoadingBtn name="Saving Discount" />
					{:else}
						<Save /> Save Discount
					{/if}
				</Button>
			</form>
		</DialogComp>
	{/if}
	<h2 class="my-4 text-2xl">No of Products: {data.productList?.length}</h2>

	<div class="mt-8 mb-4 w-6xl p-0 pt-4 lg:w-full lg:p-0">
		<FilterMenu
			bind:filteredList
			data={data?.productList}
			filterKeys={['category', 'tag', 'quantity', 'supplier']}
		/>
		<DataTable bind:selected data={filteredList} columns={visibleColumns} fileName="Product List" />
	</div>
{/if}
