import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import Copy from '$lib/Copy.svelte';
import DataTableActions from './data-table-actions.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
import { Eye } from '@lucide/svelte';

export const columns = [
	{
		accessorKey: 'index',
		header: '#',
		cell: (info) => info.row.index + 1,
		sortable: false
	},

	{
		accessorKey: 'customerName',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Name',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableLinks, {
				id: row.original.id,
				name: row.original.customerName,
				link: '/dashboard/customers'
			});
		}
	},
	{
		accessorKey: 'phone',
		header: 'Phone',
		sortable: true,
		cell: ({ row }) => renderComponent(Copy, { data: row.original.phone })
	},
	{
		accessorKey: 'Email',
		header: 'email',
		sortable: true,
		cell: ({ row }) => renderComponent(Copy, { data: row.original.email })
	},
	{
		accessorKey: 'tinNo',
		header: 'Tin Number',
		sortable: true,
		cell: ({ row }) => renderComponent(Copy, { data: row.original.tinNo })
	},
		{
		accessorKey: 'docs',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Trade Licenece',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return row.original.docs ? renderComponent(DataTableLinks, {
				id: row.original.docs,
				name:  "View Trade Licence",
				link: '/files',
				target: '_blank',
				IconComp: Eye
			}) : 'No Trade Licence';
		}
	},

	{
		accessorKey: 'createdAt',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Booked At',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},
	{
		accessorKey: 'daysSinceJoined',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Days Since Added',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => {
			const n = info.getValue(); // number of days
			return `${n} ${n === 1 ? 'day' : 'days'}`;
		}
	},
	{
		accessorKey: 'orderCount',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Order Counts',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,

		cell: (info) => {
			const n = info.getValue(); // number of days
			return `${n} ${n === 1 ? 'pending order' : 'pending orders'}`;
		}
	},

	{
		accessorKey: 'actions',
		header: 'Actions',
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableActions, {
				id: row.original.id,
				phone: row.original.phone,
				createdBy: row.original.createdBy,
				createdById: row.original.bookedById,
				customerName: row.original.customerName,
				date: row.original.date
			});
		}
	}
];
