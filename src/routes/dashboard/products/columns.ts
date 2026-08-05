import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import DataTableActions from './data-table-actions.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
import ImageViewer from '$lib/components/Table/image-viewer.svelte';
import PriceList from './priceList.svelte';
import CatList from './catList.svelte';
import type { ColumnDef } from '@tanstack/table-core';
import { Checkbox } from '$lib/components/ui/checkbox/index.js';
import Statuses from '$lib/components/Table/statuses.svelte';
import BigText from '$lib/components/Table/bigText.svelte';

export const columns = [
	{
		id: 'select',
		accessorKey: 'id',
		header: ({ table }) =>
			renderComponent(Checkbox, {
				checked: table.getIsAllPageRowsSelected(),
				class: 'bg-primary text-foreground',
				indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
				onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
				'aria-label': 'Select all'
			}),
		cell: ({ row }) =>
			renderComponent(Checkbox, {
				class: 'bg-primary text-foreground',
				checked: row.getIsSelected(),
				onCheckedChange: (value) => row.toggleSelected(!!value),
				'aria-label': 'Select row'
			}),
		enableSorting: false,
		enableHiding: false
	},
	{
		accessorKey: 'index',
		header: '#',
		cell: (info) => info.row.index + 1,
		enableSorting: false
	},

	{
		accessorKey: 'image',
		header: 'Image',
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
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
			return renderComponent(DataTableLinks, {
				id: row.original.id,
				name: row.original.name,
				link: '/dashboard/products/single'
			});
		}
	},
	{
		accessorKey: 'slug',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Slug',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},
	{
		accessorKey: 'brand',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Brand',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},
	{
		accessorKey: 'supplier',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Supplier',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? 'No Supplier'
	},
	{
		accessorKey: 'soldBy',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Sold By',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},
	{
		accessorKey: 'quantity',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Quantity',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => {
			// You can pass whatever you need from `row.original` to the component
			return info.getValue() + ' Units Left';
		}
	},
	{
		accessorKey: 'reorderLevel',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Reorder Level',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => {
			return info.getValue() + ' Units';
		}
	},

	{
		accessorKey: 'thickness',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Thickness',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? '—'
	},
	{
		accessorKey: 'width',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Width',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? '—'
	},
	{
		accessorKey: 'maxLength',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Max Length',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) =>
			row.original.maxLength
				? `${row.original.maxLength} ${row.original.maxLengthUnit ?? ''}`.trim()
				: '—'
	},
	{
		accessorKey: 'coatingType',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Coating Type',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? '—'
	},
	{
		accessorKey: 'colorOptions',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Color Options',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? '—'
	},
	{
		accessorKey: 'sizeRange',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Size Range',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? '—'
	},
	{
		accessorKey: 'finish',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Finish',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => info.getValue() ?? '—'
	},
	{
		accessorKey: 'prices',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Price',

				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,

		cell: ({ row }) => {
			return renderComponent(PriceList, {
				priceList: row.original.priceList
			});
		}
	},

	{
		accessorKey: 'category',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Categories',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			return renderComponent(CatList, {
				names: row.original.category,
				title: 'Categories'
			});
		}
	},
	{
		accessorKey: 'tag',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Tags',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(CatList, {
				names: row.original.tag,
				title: 'Tags'
			});
		}
	},

	{
		accessorKey: 'description',
		header: 'Description',
		cell: ({ row }) => {
			if (!row.original.description) return '—';
			return renderComponent(BigText, { text: row.original.description });
		}
	},
	{
		accessorKey: 'overview',
		header: 'Overview',
		cell: ({ row }) => {
			if (!row.original.overview) return '—';
			return renderComponent(BigText, { text: row.original.overview });
		}
	},
	{
		accessorKey: 'isFeaturedOnHome',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Featured',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			return renderComponent(Statuses, {
				status: row.original.isFeaturedOnHome ? 'yes' : 'no'
			});
		}
	},
	{
		accessorKey: 'createdAt',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Date Added',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => {
			const value = info.getValue();
			return value ? new Date(value).toLocaleDateString() : '—';
		}
	},

	{
		accessorKey: 'stockStatus',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Stock Status',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(Statuses, {
				status:
					row.original.quantity <= 0
						? 'out'
						: row.original.quantity <= row.original.reorderLevel + 5
							? 'low'
							: 'live'
			});
		}
	},

	{
		accessorKey: 'actions',
		header: 'Actions',
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableActions, { id: row.original.id, name: row.original.name });
		}
	}
];
