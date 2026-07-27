<script>
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},
	
		{
			accessorKey: 'label',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Label',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(Edit, {
					id: row.original.id,
					label: row.original.label,
					value: row.original.value,
					unit: row.original.unit,
					action: '?/edit',
					data: data?.editForm,
					icon: false,
					isActive: row.original.isActive
				});
			}
		},
	{
			accessorKey: 'value',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Value',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
				cell: ({ row }) => {
				return  row.original.value + ' ' + row.original.unit
			}
		
		},


		{
			accessorKey: 'isActive',
			header: 'Status',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(Statuses, {
					status: row.original.isActive ? 'Active' : 'Inactive'
				});
			}
		},

		{
			accessorKey: '',
			header: 'Edit',
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(Edit, {
					id: row.original.id,
					label: row.original.label,
					value: row.original.value,
					unit: row.original.unit,
					action: '?/edit',
					data: data?.editForm,
					icon: true,
					isActive: row.original.isActive
				});
			}
		}
	];
	let { data } = $props();
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Eye, Plus, X } from '@lucide/svelte';

	const { form, errors, enhance, delayed, message } = superForm(data.form, {});

	import { toast } from 'svelte-sonner';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
</script>

<svelte:head>
	<title>Product Categories</title>
</svelte:head>

<DialogComp title="Add New Thickness" variant="default" IconComp={Plus}>
	<form
		action="?/add"
		use:enhance
		id="main"
		class="flex flex-col gap-4"
		method="post"
		enctype="multipart/form-data"
	>
		<InputComp {form} {errors} label="Thickness Value" type="number" name="value" required={true} />

		<InputComp
			{form}
			{errors}
			label="Display Label"
			type="text"
			name="label"
			placeholder="e.g. Standard 1000mm"
		/>
		<InputComp
			{form}
			{errors}
			label="Unit"
			type="select"
			name="unit"
			items={[
				{ value: 'mm', name: 'Millimeter' },
				{ value: 'cm', name: 'Centimeter' },
				{ value: 'm', name: 'Meter' },
				{ value: 'in', name: 'Inch' },
				{ value: 'ft', name: 'Feet' }
			]}
			required={true}
			rows={10}
		/>

		<InputComp
			label="Status"
			name="isActive"
			type="select"
			{form}
			{errors}
			items={[
				{ value: true, name: 'Active' },
				{ value: false, name: 'Inactive' }
			]}
		/>

		<Button type="submit" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Thickness" />
			{:else}
				<Plus /> Add Thickness
			{/if}
		</Button>
	</form>
</DialogComp>
{#key data.allData}
	<DataTable {columns} data={data?.allData} search={true} />
{/key}
