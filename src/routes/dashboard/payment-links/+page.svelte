<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { Link2 } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import Revoke from './revoke.svelte';
	import type { LinkRow } from './types';

	let { data } = $props();

	const rows = $derived(data.allData as LinkRow[]);
	const live = $derived(rows.filter((r) => r.state === 'live').length);
	const used = $derived(rows.filter((r) => r.state === 'used').length);

	const badge = { live: 'live', used: 'paid', expired: 'dead' } as const;

	const columns: ColumnDef<LinkRow, unknown>[] = [
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'orderId',
			header: 'Order',
			cell: ({ row }) =>
				renderComponent(DataTableLinks, {
					id: String(row.original.orderId),
					name: `#${row.original.orderId}`,
					link: `/dashboard/orders`
				})
		},
		{ accessorKey: 'customerName', header: 'Customer' },
		{
			accessorKey: 'state',
			header: 'Link',
			cell: ({ row }) => renderComponent(Statuses, { status: badge[row.original.state] })
		},
		{ accessorKey: 'createdAt', header: 'Issued' },
		{ accessorKey: 'expiresAt', header: 'Expires' },
		{
			accessorKey: 'usedAt',
			header: 'Paid at',
			cell: ({ row }) => row.original.usedAt ?? '—'
		},
		{
			accessorKey: 'revoke',
			header: 'Revoke',
			cell: ({ row }) => renderComponent(Revoke, { row: row.original, data: data.revokeForm })
		}
	];
</script>

<svelte:head>
	<title>Payment Links</title>
</svelte:head>

<div class="pb-4">
	<h1 class="flex items-center gap-2 text-xl font-semibold">
		<Link2 class="h-5 w-5" /> Payment Links
	</h1>
	<p class="max-w-[75ch] text-sm text-muted-foreground">
		Every pay-by-link sent to a customer. Revoking expires a link immediately — use it if one goes to
		the wrong address. The link itself is not shown here: only a hash of it is stored, which is what
		stops anyone reading it back out of the database.
	</p>
	<div class="mt-2 flex flex-wrap gap-2">
		<Badge variant="secondary">{rows.length} issued</Badge>
		<Badge variant="outline">{live} still usable</Badge>
		<Badge variant="outline">{used} paid</Badge>
	</div>
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="Payment Links" />
{/key}
