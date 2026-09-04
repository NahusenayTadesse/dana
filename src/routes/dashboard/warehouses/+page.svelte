<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, Warehouse } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	import type { WarehouseRow } from './types';

	let { data } = $props();
	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'warehouse-add' })
	);

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') {
			toast.error($message.text);
		} else {
			toast.success($message.text);
			addOpen = false;
		}
	});

	const rows = $derived(data.allData as WarehouseRow[]);

	const columns: ColumnDef<WarehouseRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'name',
			header: 'Name',
			cell: ({ row }) => renderComponent(Edit, { row: row.original, data: data.editForm })
		},
		{ accessorKey: 'location', header: 'Location' },
		{
			accessorKey: 'isDefault',
			header: 'Default',
			cell: ({ row }) => renderComponent(Statuses, { status: row.original.isDefault ? 'yes' : 'no' })
		},
		{ accessorKey: 'stockLines', header: 'Stock lines' },
		{
			accessorKey: 'isActive',
			header: 'Status',
			cell: ({ row }) =>
				renderComponent(Statuses, { status: row.original.isActive ? 'active' : 'inactive' })
		},
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }) => renderComponent(Edit, { row: row.original, data: data.editForm, icon: true })
		}
	];
</script>

<svelte:head>
	<title>Warehouses</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<Warehouse class="h-5 w-5" /> Warehouses
		</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">
			Where finished stock is held. One is marked default — that is where a production batch lands
			unless you pick another.
		</p>
	</div>

	<DialogComp bind:open={addOpen} title="Add Warehouse" variant="default" IconComp={Plus} size="md">
		<form action="?/add" method="post" use:enhance id="wh-add-form" class="flex flex-col gap-3">
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

			<Button type="submit" class="mt-2" form="wh-add-form">
				{#if $delayed}
					<LoadingBtn name="Adding" />
				{:else}
					<Plus /> Add warehouse
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Warehouses" />
{/key}
