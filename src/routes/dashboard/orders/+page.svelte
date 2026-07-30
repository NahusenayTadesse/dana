<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import {
		Sheet,
		Loader,
		CircleCheckBig,
		OctagonMinus,
		ChevronLeft,
		ChevronRight,
		ChevronsLeft,
		ChevronsRight,
		Search,
		X
	} from '@lucide/svelte';

	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import OrderItems from '$lib/components/order-items.svelte';
	import Copy from '$lib/Copy.svelte';
	import OrderForm from './OrderForm.svelte';
	import PaymentStatus from './PaymentStatus.svelte';
	import { formatETB } from '$lib/global.svelte';

	let { data } = $props();

	const filters = [
		{ v: 'all', label: 'All', Icon: Sheet },
		{ v: 'pending', label: 'Pending', Icon: Loader },
		{ v: 'delivered', label: 'Delivered', Icon: CircleCheckBig },
		{ v: 'cancelled', label: 'Cancelled', Icon: OctagonMinus }
	];

	// Central URL builder so status + search + page always compose.
	const mkHref = (opts: { status?: string; q?: string; page?: number } = {}) => {
		const params = new URLSearchParams();
		const status = opts.status ?? data.activeStatus;
		const q = opts.q ?? data.q;
		if (status && status !== 'all') params.set('status', status);
		if (q) params.set('q', q);
		if (opts.page && opts.page > 1) params.set('page', String(opts.page));
		const qs = params.toString();
		return `/dashboard/orders${qs ? `?${qs}` : ''}`;
	};

	const itemsFor = (orderId: number) =>
		data?.allItems?.filter((it) => Number(it.orderId) === Number(orderId)) ?? [];

	const sortHeader = (name: string) => ({ column }: { column: any }) =>
		renderComponent(DataTableSort, { name, onclick: column.getToggleSortingHandler() });

	const pageWindow = $derived.by(() => {
		const span = 2;
		const start = Math.max(1, data.page - span);
		const end = Math.min(data.totalPages, data.page + span);
		const arr: number[] = [];
		for (let i = start; i <= end; i++) arr.push(i);
		return arr;
	});

	const rangeStart = $derived(data.totalOrders === 0 ? 0 : (data.page - 1) * data.perPage + 1);
	const rangeEnd = $derived(Math.min(data.page * data.perPage, data.totalOrders));

	const columns = [
		{ accessorKey: 'index', header: '#', cell: ({ row }) => (data.page - 1) * data.perPage + row.index + 1, sortable: false },
		{
			accessorKey: 'name',
			header: sortHeader('Customer'),
			sortable: true,
			cell: ({ row }) => row.original.name ?? '—'
		},
		{
			accessorKey: 'type',
			header: sortHeader('Customer Type'),
			sortable: true,
		},
		
		{
			accessorKey: 'phone',
			header: 'Phone',
			sortable: false,
			cell: ({ row }) => renderComponent(Copy, { data: row.original.phone })
		},
		{
			accessorKey: 'items',
			header: 'Items',
			sortable: false,
			cell: ({ row }) => renderComponent(OrderItems, { items: itemsFor(row.original.id), currency: 'ETB' })
		},
		{
			accessorKey: 'total',
			header: sortHeader('Total'),
			sortable: true,
			cell: ({ row }) => formatETB(Number(row.original.total ?? 0))
		},
		{
			accessorKey: 'paymentStatus',
			header: sortHeader('Payment Status'),
			sortable: true,
			cell: ({ row }) =>
				renderComponent(PaymentStatus, {
					status: row.original.paymentStatus,
					online: !!row.original.txnRef
				})
		},
		{
			accessorKey: 'status',
			header: sortHeader('Delivery Status'),
			sortable: true,
			cell: ({ row }) => renderComponent(Statuses, { status: row.original.status })
		},
		{
			accessorKey: 'edit',
			header: 'Edit',
			sortable: false,
			cell: ({ row }) =>
				renderComponent(OrderForm, {
					mode: 'edit',
					order: row.original,
					orderItems: data?.allItems,
					customerList: data?.customerList,
					productList: data?.productList,
					variantList: data?.variantList,
					paymentMethodList: data?.paymentMethodList,
					data: data?.editForm
				})
		},

			{
			accessorKey: 'txnRef',
			header: sortHeader('Chapa Token'),
			sortable: true,
			cell: ({ row }) => row.original.txnRef ? renderComponent(Copy, { data: row.original.txnRef }) : 'No Token Found'
		},
	];
</script>

<svelte:head>
	<title>Orders</title>
</svelte:head>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<div class="flex flex-wrap items-center gap-2">
		{#each filters as f}
			<Button variant={data.activeStatus === f.v ? 'default' : 'outline'} href={mkHref({ status: f.v })}>
				<f.Icon class="h-4 w-4" />
				{f.label}
			</Button>
		{/each}
	</div>

	<OrderForm
		mode="add"
		data={data?.addForm}
		customerList={data?.customerList}
		productList={data?.productList}
		variantList={data?.variantList}
		paymentMethodList={data?.paymentMethodList}
	/>
</div>

<!-- Server-side search: customer, order id, token, payment status, total -->
<form method="GET" action="/dashboard/orders" class="mb-6 flex items-center gap-2" data-sveltekit-keepfocus>
	{#if data.activeStatus !== 'all'}
		<input type="hidden" name="status" value={data.activeStatus} />
	{/if}
	<div class="relative w-full max-w-md">
		<Search class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input
			name="q"
			value={data.q}
			placeholder="Search orders, customers, tokens, totals…"
			class="pl-9"
		/>
		{#if data.q}
			<a
				href={mkHref({ q: '' })}
				class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
				aria-label="Clear search"
			>
				<X class="h-4 w-4" />
			</a>
		{/if}
	</div>
	<Button type="submit" variant="outline">Search</Button>
</form>

{#if data.q}
	<p class="mb-3 text-sm text-muted-foreground">
		{data.totalOrders} result{data.totalOrders === 1 ? '' : 's'} for “{data.q}”
	</p>
{/if}

{#key data.allOrders}
	<DataTable {columns} data={data?.allOrders} search={false} />
{/key}

<!-- Pagination -->
<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
	<p class="text-sm text-muted-foreground">
		{#if data.totalOrders === 0}
			No orders
		{:else}
			Showing {rangeStart}–{rangeEnd} of {data.totalOrders}
		{/if}
	</p>

	{#if data.totalPages > 1}
		<div class="flex items-center gap-1">
			{#if data.page > 1}
				<Button variant="outline" size="icon" href={mkHref({ page: 1 })} aria-label="First page">
					<ChevronsLeft class="h-4 w-4" />
				</Button>
				<Button variant="outline" size="icon" href={mkHref({ page: data.page - 1 })} aria-label="Previous page">
					<ChevronLeft class="h-4 w-4" />
				</Button>
			{:else}
				<Button variant="outline" size="icon" disabled aria-label="First page">
					<ChevronsLeft class="h-4 w-4" />
				</Button>
				<Button variant="outline" size="icon" disabled aria-label="Previous page">
					<ChevronLeft class="h-4 w-4" />
				</Button>
			{/if}

			{#if pageWindow[0] > 1}
				<span class="px-1 text-sm text-muted-foreground">…</span>
			{/if}

			{#each pageWindow as p}
				<Button variant={p === data.page ? 'default' : 'outline'} size="icon" href={mkHref({ page: p })}>
					{p}
				</Button>
			{/each}

			{#if pageWindow[pageWindow.length - 1] < data.totalPages}
				<span class="px-1 text-sm text-muted-foreground">…</span>
			{/if}

			{#if data.page < data.totalPages}
				<Button variant="outline" size="icon" href={mkHref({ page: data.page + 1 })} aria-label="Next page">
					<ChevronRight class="h-4 w-4" />
				</Button>
				<Button variant="outline" size="icon" href={mkHref({ page: data.totalPages })} aria-label="Last page">
					<ChevronsRight class="h-4 w-4" />
				</Button>
			{:else}
				<Button variant="outline" size="icon" disabled aria-label="Next page">
					<ChevronRight class="h-4 w-4" />
				</Button>
				<Button variant="outline" size="icon" disabled aria-label="Last page">
					<ChevronsRight class="h-4 w-4" />
				</Button>
			{/if}
		</div>
	{/if}
</div>