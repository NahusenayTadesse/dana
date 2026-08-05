<script lang="ts">
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	import Copy from '$lib/Copy.svelte';
	import BigText from '$lib/components/Table/bigText.svelte';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
	import { FileSliders } from '@lucide/svelte';

	import Read from './read.svelte';
	import Reply from './reply.svelte';
	import Delete from './delete.svelte';

	let { data } = $props();

	const columns = [
		{
			id: 'index',
			header: '#',
			cell: (info) => info.table.getRowModel().rows.findIndex((row) => row.id === info.row.id) + 1,
			enableSorting: false
		},
		{
			accessorKey: 'name',
			header: ({ column }) =>
				renderComponent(DataTableSort, { name: 'Name', onclick: column.getToggleSortingHandler() }),
			sortable: true
		},
		{
			accessorKey: 'type',
			header: ({ column }) =>
				renderComponent(DataTableSort, { name: 'Customer Type', onclick: column.getToggleSortingHandler() }),
			sortable: true
		},
		{
			accessorKey: 'phone',
			header: 'Phone',
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.phone })
		},
		{
			accessorKey: 'email',
			header: 'Email',
			sortable: true,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.email })
		},
		{
			accessorKey: 'itemCount',
			header: 'Items',
			sortable: true,
			cell: ({ row }) => (row.original.itemCount > 0 ? `${row.original.itemCount} item(s)` : '—')
		},
		{
			accessorKey: 'message',
			header: 'Message',
			cell: ({ row }) => renderComponent(BigText, { text: row.original.message ?? '' })
		},
		{
			accessorKey: 'status',
			header: ({ column }) =>
				renderComponent(DataTableSort, { name: 'Status', onclick: column.getToggleSortingHandler() }),
			sortable: true,
			cell: ({ row }) => renderComponent(Statuses, { status: row.original.status })
		},
		{
			accessorKey: 'orderRequestStatus',
			header: 'Order Confirmation',
			sortable: true,
			cell: ({ row }) =>
				row.original.orderId
					? renderComponent(Statuses, { status: row.original.orderRequestStatus ?? 'pending' })
					: '—'
		},
		{
			accessorKey: 'seen',
			header: 'Read Status',
			sortable: true,
			cell: ({ row }) =>
				row.original.seen
					? renderComponent(Statuses, { status: 'Read' })
					: renderComponent(Read, { id: row.original.id, data: data.readForm })
		},
		{
			accessorKey: 'builder',
			header: 'Order & Price Offer',
			cell: ({ row }) =>
				renderComponent(DataTableLinks, {
					id: String(row.original.id),
					name: 'View / Build Offer',
					link: '/dashboard/quotes',
					IconComp: FileSliders,
					variant: 'outline'
				})
		},
		{
			accessorKey: '',
			header: 'Reply',
			cell: ({ row }) =>
				renderComponent(Reply, {
					id: row.original.id,
					data: data.replyForm,
					name: row.original.name,
					email: row.original.email,
					replies: row.original.replies
				})
		},
		{
			accessorKey: '',
			header: 'Delete',
			cell: ({ row }) =>
				renderComponent(Delete, { id: row.original.id, action: '?/delete', data: data.deleteForm })
		}
	];

	let filteredList = $derived(data?.allQuotes);
</script>

<svelte:head>
	<title>Quote Requests</title>
</svelte:head>

{#key data?.allQuotes}
	<FilterMenu data={data?.allQuotes} bind:filteredList filterKeys={['status', 'seen', 'orderRequestStatus']} />
	<DataTable {columns} data={filteredList} search={true} fileName="Quote Requests" />
{/key}
