<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, Boxes } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	import Remove from './remove.svelte';
	import type { StockRow } from './types';

	let { data } = $props();
	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'stock-add' })
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

	const rows = $derived(data.allData as StockRow[]);
	const totalPieces = $derived(rows.reduce((sum, r) => sum + r.quantity, 0));

	const columns: ColumnDef<StockRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'variantName',
			header: 'Product',
			cell: ({ row }) =>
				renderComponent(Edit, {
					row: row.original,
					data: data.editForm,
					variants: data.variants,
					warehouses: data.warehouses
				})
		},
		{ accessorKey: 'warehouseName', header: 'Warehouse' },
		{ accessorKey: 'quantity', header: 'Quantity' },
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }) =>
				renderComponent(Edit, {
					row: row.original,
					data: data.editForm,
					variants: data.variants,
					warehouses: data.warehouses,
					icon: true
				})
		},
		{
			accessorKey: 'remove',
			header: 'Remove',
			cell: ({ row }) => renderComponent(Remove, { row: row.original, data: data.deleteForm })
		}
	];
</script>

<svelte:head>
	<title>Stock by Warehouse</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<Boxes class="h-5 w-5" /> Stock by Warehouse
		</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">
			Where each product actually sits. {rows.length} lines, {totalPieces.toLocaleString()} pieces in
			total. This is separate from the single stock figure on the product itself.
		</p>
	</div>

	<DialogComp bind:open={addOpen} title="Record Stock" variant="default" IconComp={Plus} size="lg">
		<form action="?/add" method="post" use:enhance id="stock-add-form" class="flex flex-col gap-3">
			<InputComp {form} {errors} label="Product" type="combo" name="variantId" items={data.variants} />
			<InputComp
				{form}
				{errors}
				label="Warehouse"
				type="select"
				name="warehouseId"
				items={data.warehouses}
			/>
			<InputComp {form} {errors} label="Quantity" type="number" name="quantity" min="0" />
			<p class="px-1 text-xs text-muted-foreground">
				If this product already has a count in that warehouse, this replaces it rather than adding a
				second line.
			</p>

			<Button type="submit" class="mt-2" form="stock-add-form">
				{#if $delayed}
					<LoadingBtn name="Recording" />
				{:else}
					<Plus /> Record stock
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Stock" />
{/key}
