<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, Factory } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Fields from './fields.svelte';
	import Edit from './edit.svelte';
	import type { BatchRow } from './types';

	let { data } = $props();
	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'batch-add' })
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

	const rows = $derived(data.allData as BatchRow[]);
	const produced = $derived(rows.reduce((sum, r) => sum + r.quantityProduced, 0));

	const pickers = $derived({
		variants: data.variants,
		materials: data.materials,
		people: data.people,
		warehouses: data.warehouses
	});

	const columns: ColumnDef<BatchRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'batchNumber',
			header: 'Batch',
			cell: ({ row }) =>
				renderComponent(Edit, { row: row.original, data: data.editForm, ...pickers })
		},
		{ accessorKey: 'productionDate', header: 'Date' },
		{ accessorKey: 'variantName', header: 'Product made' },
		{ accessorKey: 'quantityProduced', header: 'Pieces' },
		{
			accessorKey: 'rawMaterialName',
			header: 'Material used',
			cell: ({ row }) =>
				row.original.rawMaterialName == null
					? '—'
					: `${row.original.rawMaterialName}${
							row.original.rawMaterialConsumed == null
								? ''
								: ` · ${row.original.rawMaterialConsumed}`
						}`
		},
		{
			accessorKey: 'scrapPercent',
			header: 'Scrap',
			cell: ({ row }) =>
				row.original.scrapQuantity == null
					? '—'
					: `${row.original.scrapQuantity}${
							row.original.scrapPercent == null ? '' : ` (${row.original.scrapPercent}%)`
						}`
		},
		{ accessorKey: 'producedByName', header: 'Produced by' },
		{ accessorKey: 'warehouseName', header: 'Landed in' },
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }) =>
				renderComponent(Edit, { row: row.original, data: data.editForm, ...pickers, icon: true })
		}
	];
</script>

<svelte:head>
	<title>Production</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<Factory class="h-5 w-5" /> Production Batches
		</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">
			Coil in, sheets out. Batch numbers are what a mill certificate is traced by, so each one has to
			be unique.
		</p>
		<div class="mt-2 flex flex-wrap gap-2">
			<Badge variant="secondary">{rows.length} batches</Badge>
			<Badge variant="outline">{produced.toLocaleString()} pieces produced</Badge>
		</div>
	</div>

	<DialogComp bind:open={addOpen} title="Record Batch" variant="default" IconComp={Plus} size="lg">
		<form action="?/add" method="post" use:enhance id="batch-add-form" class="flex flex-col gap-3">
			<Fields
				{form}
				{errors}
				variants={data.variants}
				materials={data.materials}
				people={data.people}
				warehouses={data.warehouses}
			/>

			<Button type="submit" class="mt-2" form="batch-add-form">
				{#if $delayed}
					<LoadingBtn name="Recording" />
				{:else}
					<Plus /> Record batch
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Production Batches" />
{/key}
