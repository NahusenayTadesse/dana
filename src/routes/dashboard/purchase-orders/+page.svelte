<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, ClipboardList } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index';
	import OrderFields from './order-fields.svelte';
	import Edit from './edit.svelte';
	import { STATUS_BADGE, type OrderRow } from './types';

	let { data } = $props();
	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'po-add' })
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

	const rows = $derived(data.allData as OrderRow[]);
	const open = $derived(rows.filter((r) => r.status === 'ordered' || r.status === 'in_transit').length);
	const onOrder = $derived(
		rows.filter((r) => r.status !== 'received' && r.status !== 'cancelled').reduce((s, r) => s + r.value, 0)
	);

	const columns: ColumnDef<OrderRow, unknown>[] = [
		{
			accessorKey: 'id',
			header: 'PO',
			cell: ({ row }) =>
				renderComponent(DataTableLinks, {
					id: String(row.original.id),
					name: `PO-${row.original.id}`,
					link: `/dashboard/purchase-orders/${row.original.id}`
				})
		},
		{ accessorKey: 'supplierName', header: 'Supplier' },
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => renderComponent(Statuses, { status: STATUS_BADGE[row.original.status] })
		},
		{ accessorKey: 'lineCount', header: 'Lines' },
		{
			accessorKey: 'value',
			header: 'Value',
			cell: ({ row }) =>
				row.original.value ? `${row.original.value.toLocaleString()} ETB` : '—'
		},
		{
			accessorKey: 'expectedDate',
			header: 'Expected',
			cell: ({ row }) => row.original.expectedDate || '—'
		},
		{
			accessorKey: 'receivedDate',
			header: 'Received',
			cell: ({ row }) => row.original.receivedDate || '—'
		},
		{ accessorKey: 'raisedByName', header: 'Raised by' },
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }) =>
				renderComponent(Edit, {
					row: row.original,
					data: data.editForm,
					suppliers: data.suppliers,
					people: data.people,
					icon: true
				})
		}
	];
</script>

<svelte:head>
	<title>Purchase Orders</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<ClipboardList class="h-5 w-5" /> Purchase Orders
		</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">
			What you have on order from suppliers. Open a PO to add its lines — coil, or finished stock you
			are buying in.
		</p>
		<div class="mt-2 flex flex-wrap gap-2">
			<Badge variant="secondary">{rows.length} orders</Badge>
			<Badge variant="outline">{open} still open</Badge>
			{#if onOrder}
				<Badge variant="outline">{onOrder.toLocaleString()} ETB on order</Badge>
			{/if}
		</div>
	</div>

	<DialogComp bind:open={addOpen} title="New Purchase Order" variant="default" IconComp={Plus} size="md">
		<form action="?/add" method="post" use:enhance id="po-add-form" class="flex flex-col gap-3">
			<OrderFields {form} {errors} suppliers={data.suppliers} people={data.people} />

			<Button type="submit" class="mt-2" form="po-add-form">
				{#if $delayed}
					<LoadingBtn name="Creating" />
				{:else}
					<Plus /> Create order
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Purchase Orders" />
{/key}
