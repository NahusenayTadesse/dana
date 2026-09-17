<script>
	import { untrack } from 'svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { can } from '$lib/permissions';

	let { data } = $props();

	const canCreate = $derived(can(data.access, 'payment_methods.create'));
	const canEdit = $derived(can(data.access, 'payment_methods.edit'));

	const columns = $derived([
		{
			id: 'index',
			header: '#',
			cell: (info) => {
				const rowIndex = info.table.getRowModel().rows.findIndex((row) => row.id === info.row.id);
				return rowIndex + 1;
			},
			enableSorting: false
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
				// Without payment_methods.edit the name is plain text, not an edit dialog.
				if (!canEdit) return row.original.name;
				// The only edit dialog for the row — rendering a second one (the old
				// icon column) gave the row two forms with one id.
				return renderComponent(Edit, {
					id: row.original.id,
					name: row.original.name,
					isActive: row.original.isActive,
					action: '?/edit',
					data: data.editForm,
					icon: false
				});
			}
		},
		{
			accessorKey: 'isActive',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Status',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) =>
				renderComponent(Statuses, { status: row.original.isActive ? 'active' : 'inactive' })
		},

		{
			accessorKey: 'createdBy',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Created By',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				if (!row.original.createdById) return '—';
				return renderComponent(DataTableLinks, {
					id: row.original.createdById,
					name: row.original.createdBy,
					link: '/dashboard/admin-panel/users'
				});
			}
		}
	]);

	const { form, errors, enhance, delayed, message } = untrack(() => superForm(data.form, {}));

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
	<title>Payment Methods</title>
</svelte:head>

{#if canCreate}
	<DialogComp title="+ Add New Payment Method" variant="default">
		<form action="?/add" use:enhance id="main" class="flex flex-col gap-4" method="post">
			<InputComp {form} {errors} label="name" type="text" name="name" required={true} />

			<Button type="submit" form="main">
				{#if $delayed}
					<LoadingBtn name="Adding Payment Method" />
				{:else}
					<Plus /> Add Payment Method
				{/if}
			</Button>
		</form>
	</DialogComp>
{/if}
{#key data?.allPaymentMethods}
	<DataTable {columns} data={data?.allPaymentMethods} search={true} fileName="Payment Methods" />
{/key}
