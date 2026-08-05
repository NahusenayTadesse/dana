<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
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
	import OrderItems from '$lib/components/order-items.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import RequestAdjustment from '$lib/components/RequestAdjustment.svelte';
	import { formatETB } from '$lib/global.svelte';
	import type { CustomerOrderHistory } from '$lib/server/customerOrderHistory';
	import type { SuperValidated } from 'sveltekit-superforms';

	type Props = {
		data: CustomerOrderHistory;
		activeStatus: string;
		q: string;
		/** Route this table lives on — used to build filter/search/pagination links. */
		basePath: string;
		/** Only the customer's own account page passes this — lets them request
		 * an adjustment on their own not-yet-delivered orders. Omitted (or the
		 * form left unset) on every dashboard usage of this table. */
		requestAdjustmentData?: SuperValidated<Record<string, unknown>>;
	};

	let { data, activeStatus, q, basePath, requestAdjustmentData }: Props = $props();

	const filters = [
		{ v: 'all', label: 'All', Icon: Sheet },
		{ v: 'pending', label: 'Pending', Icon: Loader },
		{ v: 'delivered', label: 'Delivered', Icon: CircleCheckBig },
		{ v: 'cancelled', label: 'Cancelled', Icon: OctagonMinus }
	];

	const mkHref = (opts: { status?: string; q?: string; page?: number } = {}) => {
		const params = new URLSearchParams();
		const status = opts.status ?? activeStatus;
		const query = opts.q ?? q;
		if (status && status !== 'all') params.set('status', status);
		if (query) params.set('q', query);
		if (opts.page && opts.page > 1) params.set('page', String(opts.page));
		const qs = params.toString();
		return `${basePath}${qs ? `?${qs}` : ''}`;
	};

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

	const orderTotal = (order: CustomerOrderHistory['orders'][number]) =>
		order.offer ? Number(order.offer.total) : order.total;
</script>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
	<div class="flex flex-wrap items-center gap-2">
		{#each filters as f}
			<Button variant={activeStatus === f.v ? 'default' : 'outline'} href={mkHref({ status: f.v })}>
				<f.Icon class="h-4 w-4" />
				{f.label}
			</Button>
		{/each}
	</div>
</div>

<form method="GET" action={basePath} class="mb-6 flex items-center gap-2" data-sveltekit-keepfocus>
	{#if activeStatus !== 'all'}
		<input type="hidden" name="status" value={activeStatus} />
	{/if}
	<div class="relative w-full max-w-md">
		<Search class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
		<Input name="q" value={q} placeholder="Search orders, totals, tokens…" class="pl-9" />
		{#if q}
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

{#if q}
	<p class="mb-3 text-sm text-muted-foreground">
		{data.totalOrders} result{data.totalOrders === 1 ? '' : 's'} for "{q}"
	</p>
{/if}

{#if data.orders.length === 0}
	<div class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No orders found.</div>
{:else}
	<div class="overflow-x-auto rounded-xl border border-border">
		<table class="w-full min-w-[720px] border-collapse text-left text-sm">
			<thead>
				<tr class="bg-muted/40">
					<th class="px-4 py-3 font-semibold text-muted-foreground">Order</th>
					<th class="px-4 py-3 font-semibold text-muted-foreground">Items</th>
					<th class="px-4 py-3 font-semibold text-muted-foreground">Placed</th>
					<th class="px-4 py-3 font-semibold text-muted-foreground">Delivery</th>
					<th class="px-4 py-3 font-semibold text-muted-foreground">Status</th>
					<th class="px-4 py-3 font-semibold text-muted-foreground">Payment</th>
					<th class="px-4 py-3 text-right font-semibold text-muted-foreground">Total</th>
					{#if requestAdjustmentData}
						<th class="px-4 py-3 font-semibold text-muted-foreground">Adjustment</th>
					{/if}
				</tr>
			</thead>
			<tbody>
				{#each data.orders as order (order.id)}
					<tr class="border-t border-border">
						<td class="px-4 py-3 font-mono text-xs text-muted-foreground">#{order.id}</td>
						<td class="px-4 py-3"><OrderItems items={order.items} currency="ETB" /></td>
						<td class="px-4 py-3 whitespace-nowrap">
							{new Date(order.createdAt).toLocaleDateString()}
						</td>
						<td class="px-4 py-3 whitespace-nowrap">
							{order.deliveryDate ?? '—'}
						</td>
						<td class="px-4 py-3"><Statuses status={order.status ?? 'pending'} /></td>
						<td class="px-4 py-3">
							{#if order.paymentStatus}
								<Statuses status={order.paymentStatus} />
							{:else}
								<span class="text-xs text-muted-foreground">—</span>
							{/if}
						</td>
						<td class="px-4 py-3 text-right font-semibold">{formatETB(orderTotal(order))}</td>
						{#if requestAdjustmentData}
							<td class="px-4 py-3">
								{#if order.status === 'pending'}
									<RequestAdjustment data={requestAdjustmentData} orderId={order.id} />
								{:else}
									<span class="text-xs text-muted-foreground">—</span>
								{/if}
							</td>
						{/if}
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

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
