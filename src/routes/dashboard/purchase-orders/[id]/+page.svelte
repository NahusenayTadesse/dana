<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, ArrowLeft, Save } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button, buttonVariants } from '$lib/components/ui/button/index';
	import OrderFields from '../order-fields.svelte';
	import LineFields from './line-fields.svelte';
	import EditLine from './edit-line.svelte';
	import RemoveLine from './remove-line.svelte';
	import { STATUS_BADGE, type LineRow, type OrderRow } from '../types';

	let { data } = $props();
	let addOpen = $state(false);

	const order = $derived(data.order as OrderRow);
	const rows = $derived(data.allData as LineRow[]);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'poline-add' })
	);

	const {
		form: headForm,
		errors: headErrors,
		enhance: headEnhance,
		delayed: headDelayed,
		message: headMessage,
		allErrors: headAllErrors
	} = untrack(() => superForm(data.orderForm, { resetForm: false, dataType: 'json', id: 'po-head' }));

	untrack(() => {
		const o = data.order as OrderRow;
		$form.purchaseOrderId = o.id;
		$headForm.id = o.id;
		$headForm.supplierId = o.supplierId;
		$headForm.status = o.status;
		$headForm.expectedDate = o.expectedDate;
		$headForm.receivedDate = o.receivedDate;
		$headForm.raisedBy = o.raisedBy;
		$headForm.notes = o.notes ?? '';
	});

	$effect(() => {
		const msg = $message ?? $headMessage;
		if (!msg) return;
		if (msg.type === 'error') {
			toast.error(msg.text);
		} else {
			toast.success(msg.text);
			addOpen = false;
		}
	});

	const priced = $derived(rows.filter((r) => r.unitCost != null).length);

	const columns: ColumnDef<LineRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'itemName',
			header: 'Item',
			cell: ({ row }) =>
				renderComponent(EditLine, {
					row: row.original,
					data: data.editForm,
					materials: data.materials,
					variants: data.variants
				})
		},
		{
			accessorKey: 'kind',
			header: 'Kind',
			cell: ({ row }) => (row.original.rawMaterialId ? 'Raw material' : 'Finished product')
		},
		{ accessorKey: 'quantity', header: 'Quantity' },
		{
			accessorKey: 'unitCost',
			header: 'Unit cost',
			cell: ({ row }) =>
				row.original.unitCost == null ? '—' : `${row.original.unitCost.toLocaleString()} ETB`
		},
		{
			accessorKey: 'lineTotal',
			header: 'Line total',
			cell: ({ row }) =>
				row.original.lineTotal == null ? '—' : `${row.original.lineTotal.toLocaleString()} ETB`
		},
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }) =>
				renderComponent(EditLine, {
					row: row.original,
					data: data.editForm,
					materials: data.materials,
					variants: data.variants,
					icon: true
				})
		},
		{
			accessorKey: 'remove',
			header: 'Remove',
			cell: ({ row }) => renderComponent(RemoveLine, { row: row.original, data: data.deleteForm })
		}
	];
</script>

<svelte:head>
	<title>PO-{order.id}</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<a href="/dashboard/purchase-orders" class="{buttonVariants({ variant: 'ghost', size: 'sm' })} -ml-2 mb-1">
			<ArrowLeft class="h-4 w-4" /> All purchase orders
		</a>
		<h1 class="text-xl font-semibold">PO-{order.id} · {order.supplierName ?? 'No supplier'}</h1>
		<div class="mt-2 flex flex-wrap items-center gap-2">
			<Statuses status={STATUS_BADGE[order.status]} />
			<Badge variant="secondary">{rows.length} lines</Badge>
			<Badge variant="outline">{order.value.toLocaleString()} ETB</Badge>
			{#if priced < rows.length}
				<Badge variant="outline">{rows.length - priced} without a price yet</Badge>
			{/if}
		</div>
	</div>

	<DialogComp bind:open={addOpen} title="Add Line" variant="default" IconComp={Plus} size="lg">
		<form action="?/addLine" method="post" use:enhance id="poline-add-form" class="flex flex-col gap-3">
			<LineFields {form} {errors} materials={data.materials} variants={data.variants} />

			<Button type="submit" class="mt-2" form="poline-add-form">
				{#if $delayed}
					<LoadingBtn name="Adding" />
				{:else}
					<Plus /> Add line
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

<div class="mb-6 rounded-xl border p-4">
	<h2 class="mb-3 text-sm font-semibold">Order details</h2>
	<form
		action="?/editOrder"
		method="post"
		use:headEnhance
		id="po-head-form"
		class="grid gap-3 md:grid-cols-2"
	>
		<div class="md:col-span-2"><Errors allErrors={$headAllErrors} /></div>
		<OrderFields
			form={headForm}
			errors={headErrors}
			suppliers={data.suppliers}
			people={data.people}
		/>
		<div class="flex justify-end md:col-span-2">
			<Button type="submit" form="po-head-form">
				{#if $headDelayed}
					<LoadingBtn name="Saving" />
				{:else}
					<Save class="h-4 w-4" /> Save details
				{/if}
			</Button>
		</div>
	</form>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={false} fileName="PO-{order.id}" />
{/key}
