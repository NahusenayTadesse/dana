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
			accessorKey: 'image',
			header: 'Swatch Image',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(ImageViewer, {
					src: row.original.image,
					alt: row.original.name
				});
			}
		},
		{
			accessorKey: 'name',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Name',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				// You can pass whatever you need from `row.original` to the component
				return renderComponent(Edit, {
					id: row.original.id,
					name: row.original.name,
					code: row.original.code,
					hexValue: row.original.hexValue,
					image: row.original.image,
					action: '?/edit',
					data: data?.editForm,
					icon: false,
				});
			}
		},

			{
			accessorKey: 'code',
			header: 'Code',
			sortable: true,
		
		},


		{
			accessorKey: 'hexValue',
			header: 'Hex value',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(ColorViewer, {
					hex: row.original.hexValue
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
					name: row.original.name,
					code: row.original.code,
					hexValue: row.original.hexValue,
					image: row.original.image,
					action: '?/edit',
					data: data?.editForm,
					icon: true,
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
	import ColorViewer from './colorViewer.svelte';
	import ImageViewer from '$lib/components/Table/image-viewer.svelte';
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
	<title>Colors</title>
</svelte:head>

<DialogComp title="Add New Color" variant="default" IconComp={Plus}>
	<form
		action="?/add"
		use:enhance
		id="main"
		class="flex flex-col gap-4"
		method="post"
		enctype="multipart/form-data"
	>
		<InputComp {form} {errors} label="name" type="text" name="name" required={true} />

		<InputComp
			{form}
			{errors}
			label="Code"
			type="text"
			name="code"
			placeholder="Enter Code"
			required={true}
		/>
		<InputComp
			label="hexValue"
			name="hexValue"
			type="text"
			{form}
			{errors}
	
		/>
			<InputComp
			label="Swatch Image"
			name="image"
			type="file"
			{form}
			{errors}
	
		/>

		<Button type="submit" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Color" />
			{:else}
				<Plus /> Add Color
			{/if}
		</Button>
	</form>
</DialogComp>
{#key data.allData}
	<DataTable {columns} data={data?.allData} search={true} />
{/key}
