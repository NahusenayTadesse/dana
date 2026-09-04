<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, HardHat } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	import type { StaffRow } from './types';

	let { data } = $props();
	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'staff-add' })
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

	const rows = $derived(data.allData as StaffRow[]);
	const here = $derived(rows.filter((r) => r.isActive).length);

	const columns: ColumnDef<StaffRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'name',
			header: 'Name',
			cell: ({ row }) => renderComponent(Edit, { row: row.original, data: data.editForm })
		},
		{ accessorKey: 'role', header: 'Job title' },
		{ accessorKey: 'phone', header: 'Phone' },
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
	<title>Staff</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<HardHat class="h-5 w-5" /> Staff
		</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">
			The people named on production batches, purchase orders and damage reports. {here} of {rows.length}
			are current.
		</p>
	</div>

	<DialogComp bind:open={addOpen} title="Add Person" variant="default" IconComp={Plus} size="md">
		<form action="?/add" method="post" use:enhance id="staff-add-form" class="flex flex-col gap-3">
			<InputComp {form} {errors} label="Name" type="text" name="name" required={true} />
			<InputComp
				{form}
				{errors}
				label="Job title"
				type="text"
				name="role"
				placeholder="Machine Operator"
			/>
			<InputComp {form} {errors} label="Phone" type="tel" name="phone" placeholder="0911 000 000" />
			<InputComp
				{form}
				{errors}
				label="Still here"
				type="checkboxSingle"
				name="isActive"
				placeholder="Uncheck when someone leaves — their past records stay"
			/>

			<Button type="submit" class="mt-2" form="staff-add-form">
				{#if $delayed}
					<LoadingBtn name="Adding" />
				{:else}
					<Plus /> Add person
				{/if}
			</Button>
		</form>
	</DialogComp>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Staff" />
{/key}
