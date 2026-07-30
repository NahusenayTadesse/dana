<script lang="ts">
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import FilterMenu from '$lib/components/Table/FilterMenu.svelte';
	import Copy from '$lib/Copy.svelte';
	import BigText from '$lib/components/Table/bigText.svelte';

	import Read from './read.svelte';
	import Reply from './reply.svelte';
	import Delete from './delete.svelte';

	let { data } = $props();

	function variantLabel(row) {
		const parts = [];
		if (row.colorName) parts.push(row.colorName);
		const width = row.widthLabel || (row.widthValue ? `${row.widthValue}${row.widthUnit}` : null);
		if (width) parts.push(width);
		const thickness = row.thicknessValue ? `${row.thicknessValue}${row.thicknessUnit}` : null;
		if (thickness) parts.push(thickness);
		return parts.join(' · ');
	}

	function productLabel(row) {
		if (!row.productName) return row.categoryName ? `Category: ${row.categoryName}` : 'General inquiry';
		const spec = variantLabel(row);
		return `${row.productName}${spec ? ` (${spec})` : ''}`;
	}

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
		// {
		// 	accessorKey: 'companyName',
		// 	header: 'Company',
		// 	sortable: true
		// },
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
			accessorKey: 'productName',
			header: 'Product / Spec',
			sortable: true,
			cell: ({ row }) => productLabel(row.original)
		},
		{
			accessorKey: 'quantityEstimate',
			header: 'Est. Quantity',
			sortable: true
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
			accessorKey: 'seen',
			header: 'Read Status',
			sortable: true,
			cell: ({ row }) =>
				row.original.seen
					? renderComponent(Statuses, { status: 'Read' })
					: renderComponent(Read, { id: row.original.id, data: data.readForm })
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
					productLabel: productLabel(row.original),
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
	<FilterMenu data={data?.allQuotes} bind:filteredList filterKeys={['status', 'seen', 'categoryName']} />
	<DataTable {columns} data={filteredList} search={true} fileName="Quote Requests" />
{/key}