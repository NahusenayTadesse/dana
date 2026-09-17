import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';

export const columns = [
	{
		accessorKey: 'index',
		header: '#',
		cell: (info) => info.row.index + 1
	},

	{
		accessorKey: 'date',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Changed At',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},

	{
		accessorKey: 'quantity',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Changed Quantity',
				onclick: column.getToggleSortingHandler()
			}),

		sortable: true
	},

	{
		accessorKey: 'changedBy',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Changed By',
				onclick: column.getToggleSortingHandler()
			}),

		sortable: true,
		// DataTableLinks builds `${link}/${id}`; users live under admin-panel.
		cell: ({ row }) => {
			if (!row.original.changedById) return row.original.changedBy ?? '—';
			return renderComponent(DataTableLinks, {
				id: row.original.changedById,
				name: row.original.changedBy,
				link: '/dashboard/admin-panel/users',
				target: '_blank'
			});
		}
	},

	{
		accessorKey: 'reason',
		header: 'Reason',
		cell: ({ row }) => row.original.reason ?? '—'
	},

	{
		accessorKey: 'reciept',
		header: 'Reciept',
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			//
			if (row.original.reciept) {
				// Uploaded files are served from /files/[name].
				return renderComponent(DataTableLinks, {
					id: row.original.reciept,
					name: 'View Reciept',
					link: '/files',
					target: '_blank'
				});
			} else {
				return 'No Reciept';
			}
		}
	}

	// {
	// 	accessorKey: 'action',
	// 	header: 'Actions',
	// 	cell: ({ row }) => {
	// 		// You can pass whatever you need from `row.original` to the component
	// 		return renderComponent(DataTableActions, {
	// 			id: row.original.id,
	// 			recieptLink: row.original.recieptLink,
	// 			date: row.original.date
	// 		});
	// 	}
	// }
];
