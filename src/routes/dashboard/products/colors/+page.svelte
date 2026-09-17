<script>
	import { untrack } from 'svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	import { can } from '$lib/permissions';
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
			sortable: true
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
			sortable: false,
			cell: ({ row }) => {
				// The only edit sheet per row: two instances of the same form would
				// share an id and the action result would land in the closed one.
				return renderComponent(Edit, {
					id: row.original.id,
					name: row.original.name,
					code: row.original.code,
					hexValue: row.original.hexValue,
					image: row.original.image,
					action: '?/edit',
					data: data?.editForm
				});
			}
		}
	];
	let { data } = $props();
	const canCreate = $derived(can(data.access, 'catalog.create'));
	const canEdit = $derived(can(data.access, 'catalog.edit'));
	const visibleColumns = $derived(
		canEdit ? columns : columns.filter((column) => column.header !== 'Edit')
	);
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus } from '@lucide/svelte';

	const { form, errors, enhance, delayed, message } = untrack(() => superForm(data.form, {}));

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

{#if canCreate}
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

			<InputComp {form} {errors} label="Code" type="text" name="code" placeholder="Enter Code" />
			<InputComp
				label="Hex Value"
				name="hexValue"
				type="text"
				placeholder="#C1121F"
				required={true}
				{form}
				{errors}
			/>
			<InputComp
				label="Swatch Image"
				name="image"
				type="file"
				placeholder="JPEG, PNG, WEBP, AVIF or GIF (Max 10MB)"
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
{/if}
{#key data.allData}
	<DataTable columns={visibleColumns} data={data?.allData} search={true} />
{/key}
