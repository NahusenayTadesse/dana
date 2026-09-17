import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
import Statuses from '$lib/components/Table/statuses.svelte';
import { formatETB } from '$lib/global.svelte';

export const columns = [
	{
		accessorKey: 'orderId',
		header: '#',
		cell: (info) => info.row.index + 1,
		sortable: false
	},

	{
		accessorKey: 'status',
		header: 'Status',
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(Statuses, {
				status: row.original.status
			});
		}
	},

	{
		accessorKey: 'productName',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Product Name',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableLinks, {
				id: row.original.productId,
				name: row.original.productName,
				link: '/dashboard/products/single'
			});
		}
	},

	{
		accessorKey: 'quantityPurchased',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Quantity Purchased',

				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? '—'
	},

	{
		accessorKey: 'unitPrice',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Unit Price',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => (info.getValue() == null ? 'Not priced' : formatETB(Number(info.getValue())))
	},

	{
		accessorKey: 'priceBasis',
		header: 'Priced Per',
		sortable: true
	},

	{
		accessorKey: 'vat',
		header: 'VAT in Price',
		sortable: true
	},

	{
		accessorKey: 'lineTotal',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Line Total',
				onclick: column.getToggleSortingHandler()
			}),
		cell: (info) => (info.getValue() == null ? '—' : formatETB(info.getValue()))
	},

	{
		accessorKey: 'totalPaid',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Order Paid',
				onclick: column.getToggleSortingHandler()
			}),
		// Only the order's first line carries the amount, so it isn't counted twice.
		cell: (info) => (info.getValue() == null ? '—' : formatETB(info.getValue()))
	},

	{
		accessorKey: 'receipt',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Receipt',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// No receipt → plain text; a link here used to point at `/files/null`.
			return row.original.receipt
				? renderComponent(DataTableLinks, {
						id: row.original.receipt,
						name: 'View Receipt',
						link: '/files',
						target: '_blank'
					})
				: 'No Receipt Found';
		}
	}
];
