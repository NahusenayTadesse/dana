<script>
	import { untrack } from 'svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	import { can } from '$lib/permissions';

	let { data } = $props();

	const canCreate = $derived(can(data.access, 'blog.create'));
	const canEdit = $derived(can(data.access, 'blog.edit'));
	const canDelete = $derived(can(data.access, 'blog.delete'));

	const columns = $derived([
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
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
			accessorKey: 'description',
			header: 'Description',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(BigText, {
					text: row.original.description
				});
			}
		},

		...(canEdit
			? [
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
								description: row.original.description,
								action: '?/edit',
								data: data?.editForm
							});
						}
					}
				]
			: []),
		...(canDelete
			? [
					{
						accessorKey: '',
						header: 'Delete',
						sortable: false,
						cell: ({ row }) => {
							return renderComponent(Delete, {
								id: row.original.id,
								action: '?/delete',
								data: data.deleteForm
							});
						}
					}
				]
			: [])
	]);
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus } from '@lucide/svelte';

	const { form, errors, enhance, delayed, message } = untrack(() => superForm(data.form, {}));

	import { toast } from 'svelte-sonner';
	import BigText from '$lib/components/Table/bigText.svelte';
	import Delete from './delete.svelte';
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
	<title>Blog Categories</title>
</svelte:head>

{#key data.allData}
	{#if canCreate}
		<DialogComp title="Add New Category" IconComp={Plus} variant="default">
			<form action="?/add" use:enhance id="main" class="flex flex-col gap-4" method="post">
				<InputComp {form} {errors} label="name" type="text" name="name" required={true} />

				<InputComp
					{form}
					{errors}
					label="Description"
					type="textarea"
					name="description"
					placeholder="Enter Category Description"
					required={true}
					rows={10}
				/>

				<Button type="submit" form="main">
					{#if $delayed}
						<LoadingBtn name="Adding Category" />
					{:else}
						<Plus /> Add Category
					{/if}
				</Button>
			</form>
		</DialogComp>
	{/if}

	<DataTable {columns} data={data?.allData} search={true} />
{/key}
