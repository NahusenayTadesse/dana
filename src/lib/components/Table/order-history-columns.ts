import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableSort from './data-table-sort.svelte';
import Statuses from './statuses.svelte';
import OrderItems from '$lib/components/order-items.svelte';
import RequestAdjustment from '$lib/components/RequestAdjustment.svelte';
import { formatETB } from '$lib/global.svelte';
import type { SuperValidated } from 'sveltekit-superforms';

const orderTotal = (order: any) => (order.offer ? Number(order.offer.total) : order.total);

/**
 * Columns for a customer's order history. `requestAdjustmentData` is only
 * supplied on the customer's own account page — dashboard usages omit it and
 * the Adjustment column disappears.
 */
export function orderHistoryColumns(
	requestAdjustmentData?: SuperValidated<Record<string, unknown>>
) {
	const cols: any[] = [
		{
			accessorKey: 'id',
			header: ({ column }: any) =>
				renderComponent(DataTableSort, {
					name: 'Order',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }: any) => `#${row.original.id}`
		},
		{
			accessorKey: 'items',
			header: 'Items',
			sortable: false,
			cell: ({ row }: any) => renderComponent(OrderItems, { items: row.original.items, currency: 'ETB' })
		},
		{
			accessorKey: 'createdAt',
			header: ({ column }: any) =>
				renderComponent(DataTableSort, {
					name: 'Placed',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }: any) => new Date(row.original.createdAt).toLocaleDateString()
		},
		{
			accessorKey: 'deliveryDate',
			header: ({ column }: any) =>
				renderComponent(DataTableSort, {
					name: 'Delivery',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }: any) => row.original.deliveryDate ?? '—'
		},
		{
			accessorKey: 'status',
			header: 'Status',
			sortable: true,
			cell: ({ row }: any) => renderComponent(Statuses, { status: row.original.status ?? 'pending' })
		},
		{
			accessorKey: 'paymentStatus',
			header: 'Payment',
			sortable: true,
			cell: ({ row }: any) =>
				row.original.paymentStatus
					? renderComponent(Statuses, { status: row.original.paymentStatus })
					: '—'
		},
		{
			accessorKey: 'total',
			header: ({ column }: any) =>
				renderComponent(DataTableSort, {
					name: 'Total',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }: any) => formatETB(orderTotal(row.original))
		}
	];

	if (requestAdjustmentData) {
		cols.push({
			accessorKey: 'adjustment',
			header: 'Adjustment',
			sortable: false,
			cell: ({ row }: any) =>
				row.original.status === 'pending'
					? renderComponent(RequestAdjustment, {
							data: requestAdjustmentData,
							orderId: row.original.id
						})
					: '—'
		});
	}

	return cols;
}
