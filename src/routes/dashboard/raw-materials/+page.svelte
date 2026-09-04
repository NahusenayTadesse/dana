<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, Layers } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index';
	import { UNIT_ITEMS } from './units';
	import Edit from './edit.svelte';
	import type { MaterialRow } from './types';

	let { data } = $props();
	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'material-add' })
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

	const rows = $derived(data.allData as MaterialRow[]);
	const low = $derived(rows.filter((r) => r.stockState === 'low').length);

	const columns: ColumnDef<MaterialRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'name',
			header: 'Material',
			cell: ({ row }) =>
				renderComponent(Edit, { row: row.original, data: data.editForm, suppliers: data.suppliers })
		},
		{ accessorKey: 'supplierName', header: 'Supplier' },
		{
			accessorKey: 'quantityOnHand',
			header: 'On hand',
			cell: ({ row }) => `${row.original.quantityOnHand} ${row.original.unit}`
		},
		{
			accessorKey: 'reorderLevel',
			header: 'Reorder at',
			cell: ({ row }) =>
				row.original.reorderLevel == null ? '—' : `${row.original.reorderLevel} ${row.original.unit}`
		},
		{
			accessorKey: 'stockState',
			header: 'Stock',
			cell: ({ row }) =>
				row.original.stockState === 'none'
					? '—'
					: renderComponent(Statuses, {
							status: row.original.stockState === 'low' ? 'low' : 'active'
						})
		},
		{
			accessorKey: 'isActive',
			header: 'Status',
			cell: ({ row }) =>
				renderComponent(Statuses, { status: row.original.isActive ? 'active' : 'inactive' })
		},
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }) =>
				renderComponent(Edit, {
					row: row.original,
					data: data.editForm,
					suppliers: data.suppliers,
					icon: true
				})
		}
	];
</script>

<svelte:head>
	<title>Raw Materials</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<Layers class="h-5 w-5" /> Raw Materials
		</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">
			What goes into production — coil, zinc, paint. A material with a reorder level is flagged once
			it drops to it.
		</p>
		{#if low}
			<Badge variant="destructive" class="mt-2">{low} at or below reorder level</Badge>
		{/if}
	</div>

	<DialogComp bind:open={addOpen} title="Add Material" variant="default" IconComp={Plus} size="md">
		<form action="?/add" method="post" use:enhance id="mat-add-form" class="flex flex-col gap-3">
			<InputComp
				{form}
				{errors}
				label="Material"
				type="text"
				name="name"
				placeholder="Cold Rolled Coil"
				required={true}
			/>
			<InputComp
				{form}
				{errors}
				label="Supplier"
				type="select"
				name="supplierId"
				items={data.suppliers}
			/>
			<InputComp {form} {errors} label="Unit" type="select" name="unit" items={UNIT_ITEMS} />
			<InputComp
				{form}
				{errors}
				label="Quantity on hand"
				type="number"
				name="quantityOnHand"
				min="0"
			/>
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

			<Button type="submit" class="mt-2" form="mat-add-form">
				{#if $delayed}
					<LoadingBtn name="Adding" />
				{:else}
					<Plus /> Add material
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Raw Materials" />
{/key}
