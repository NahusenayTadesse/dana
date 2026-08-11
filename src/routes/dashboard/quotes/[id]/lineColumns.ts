import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
import LineForm from './LineForm.svelte';
import { formatETB } from '$lib/global.svelte';

type Item = { value: number; name: string };

/**
 * Order-line columns for the quote detail page. Built as a factory because the
 * inline edit form needs the same lookup lists the page loaded.
 */
export function lineColumns(ctx: {
	updateLineForm: any;
	orderId: number;
	productList?: Item[];
	variantList?: (Item & { productId: number })[];
	ratesByVariant?: Record<number, any[]>;
	colorList?: Item[];
}) {
	return [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info: any) => info.row.index + 1,
			sortable: false
		},
		{
			accessorKey: 'productName',
			header: ({ column }: any) =>
				renderComponent(DataTableSort, {
					name: 'Product',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true
		},
		{
			accessorKey: 'spec',
			header: 'Spec',
			sortable: false,
			cell: ({ row }: any) => specLabel(row.original) || '—'
		},
		{
			accessorKey: 'priceBasis',
			header: ({ column }: any) =>
				renderComponent(DataTableSort, {
					name: 'Basis',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true
		},
		{
			accessorKey: 'price',
			header: ({ column }: any) =>
				renderComponent(DataTableSort, {
					name: 'Rate',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }: any) =>
				row.original.price != null ? formatETB(Number(row.original.price)) : '—'
		},
		{
			accessorKey: 'priceIncludesVat',
			header: 'VAT',
			sortable: true,
			cell: ({ row }: any) => (row.original.priceIncludesVat ? 'Included' : 'Excluded')
		},
		{
			accessorKey: 'actions',
			header: 'Edit',
			sortable: false,
			cell: ({ row }: any) =>
				renderComponent(LineForm, {
					mode: 'edit' as const,
					data: ctx.updateLineForm,
					orderId: ctx.orderId,
					line: row.original,
					productList: ctx.productList ?? [],
					variantList: ctx.variantList ?? [],
					ratesByVariant: ctx.ratesByVariant ?? {},
					colorList: ctx.colorList ?? []
				})
		}
	];
}

export const specLabel = (item: Record<string, any>) =>
	[
		item.colorName,
		item.thickness != null
			? `${Number(item.thickness)}${item.thicknessUnit === 'gauge' ? 'ga' : item.thicknessUnit}`
			: null,
		item.width != null ? `${Number(item.width)}${item.widthUnit}` : null,
		item.length != null ? `${Number(item.length)}${item.lengthUnit}` : null,
		item.weight != null ? `${Number(item.weight)}${item.weightUnit}` : null
	]
		.filter(Boolean)
		.join(' · ');
