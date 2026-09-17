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
	import { can } from '$lib/permissions';
	import type { WarehouseRow } from './types';

	let { data } = $props();
	let addOpen = $state(false);

	const canCreate = $derived(can(data.access, 'warehouses.create'));
	const canEdit = $derived(can(data.access, 'warehouses.edit'));

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

	const baseColumns: ColumnDef<WarehouseRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		// Only the Edit column renders the edit dialog: two instances of one
		// per-row superForm id would send the action result to the wrong one.
		{ accessorKey: 'name', header: 'Name' },
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
		}
	];

	const editColumn: ColumnDef<WarehouseRow, unknown> = {
		accessorKey: 'edit',
		header: 'Edit',
		cell: ({ row }) => renderComponent(Edit, { row: row.original, data: data.editForm, icon: true })
	};

	// Only show the Edit column when this user's role may edit (the server refuses it anyway).
	const columns = $derived(canEdit ? [...baseColumns, editColumn] : baseColumns);
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
			Where finished stock is held. One is always marked default — that is where production batches
			and received purchase orders land unless you pick another. To change it, mark another warehouse
			as default.
		</p>
	</div>

	{#if canCreate}
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
	{/if}
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Warehouses" />
{/key}
