import { renderComponent } from '$lib/components/ui/data-table/index.js';
import Copy from '$lib/Copy.svelte';
import Statuses from './statuses.svelte';

export type SingleRow = { name: string; value: string };

/** Two-column detail view (label / value) rendered through the shared DataTable. */
export const singleColumns = [
	{
		accessorKey: 'name',
		header: 'Detail',
		sortable: false,
		cell: ({ row }: any) => row.original.name
	},
	{
		accessorKey: 'value',
		header: 'Value',
		sortable: false,
		cell: ({ row }: any) => {
			if (row.original.name === 'Phone') return renderComponent(Copy, { data: row.original.value });
			if (row.original.name === 'Status')
				return renderComponent(Statuses, { status: row.original.value });
			return row.original.value;
		}
	}
];
