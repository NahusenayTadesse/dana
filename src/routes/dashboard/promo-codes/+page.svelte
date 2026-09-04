<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, TicketPercent } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import DateField from './date-field.svelte';
	import Edit from './edit.svelte';
	import PromoStatus from './promo-status.svelte';
	import type { PromoRow } from './types';

	let { data } = $props();

	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'promo-add' })
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

	const live = $derived(data.allData.filter((row: PromoRow) => row.status === 'Active').length);

	const columns: ColumnDef<PromoRow, unknown>[] = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1
		},
		{
			accessorKey: 'code',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Code',
					onclick: column.getToggleSortingHandler()
				}),
			cell: ({ row }) => renderComponent(Edit, { row: row.original, data: data.editForm })
		},
		{
			accessorKey: 'discountLabel',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Discount',
					onclick: column.getToggleSortingHandler()
				})
		},
		{ accessorKey: 'reason', header: 'Reason' },
		{ accessorKey: 'window', header: 'Valid' },
		{ accessorKey: 'usage', header: 'Used' },
		{
			accessorKey: 'status',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Status',
					onclick: column.getToggleSortingHandler()
				}),
			cell: ({ row }) => renderComponent(PromoStatus, { status: row.original.status })
		},
		{
			accessorKey: 'edit',
			header: 'Edit',
			cell: ({ row }) => renderComponent(Edit, { row: row.original, data: data.editForm, icon: true })
		}
	];
</script>

<svelte:head>
	<title>Promo Codes</title>
</svelte:head>

<div class="flex flex-wrap items-center justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<TicketPercent class="h-5 w-5" /> Promo Codes
		</h1>
		<p class="text-sm text-muted-foreground">
			{data.allData.length}
			{data.allData.length === 1 ? 'code' : 'codes'} · {live} usable right now. Sales staff pick from
			these when replying to a quote.
		</p>
	</div>

	<DialogComp bind:open={addOpen} title="Add Promo Code" variant="default" IconComp={Plus} size="md">
		<form action="?/add" method="post" use:enhance id="add-promo" class="flex flex-col gap-3">
			<InputComp
				{form}
				{errors}
				label="Code"
				type="text"
				name="code"
				placeholder="NEWYEAR26"
				required={true}
			/>
			<InputComp
				{form}
				{errors}
				label="Discount (%)"
				type="number"
				name="discountPercentage"
				min="0.01"
				max="100"
				required={true}
			/>
			<InputComp
				{form}
				{errors}
				label="Reason"
				type="text"
				name="reason"
				placeholder="New Year promo, reseller partner…"
			/>

			<DateField {form} {errors} label="Starts" name="startsAt" hint="Leave blank to start now" />
			<DateField
				{form}
				{errors}
				label="Ends"
				name="expiresAt"
				hint="Leave blank for no end date. The code works all through this day."
			/>

			<InputComp
				{form}
				{errors}
				label="Usage limit"
				type="number"
				name="maxUses"
				min="1"
				placeholder="Leave blank for unlimited"
			/>
			<InputComp
				{form}
				{errors}
				label="Available"
				type="checkboxSingle"
				name="isActive"
				placeholder="Sales staff can apply this code"
			/>

			<Button type="submit" class="mt-2" form="add-promo">
				{#if $delayed}
					<LoadingBtn name="Adding code" />
				{:else}
					<Plus /> Add code
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

{#key data.allData}
	<DataTable {columns} data={data.allData} search={true} fileName="Promo Codes" />
{/key}
