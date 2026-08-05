<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import OrderHistoryTable from '$lib/components/OrderHistoryTable.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Order History for {data?.customer?.customerName}</title>
</svelte:head>

<Button href="/dashboard/customers/{page.params.id}">
	<ArrowLeft /> Back
</Button>

<header class="mt-6 flex w-lg flex-col gap-1 pb-4">
	<h1 class="text-3xl font-bold tracking-tight text-foreground">Order History</h1>
	<p class="text-sm text-foreground">
		Viewing records for <span class="font-semibold text-slate-700">{data?.customer?.customerName}</span>
	</p>
</header>

<OrderHistoryTable
	data={data.history}
	activeStatus={data.activeStatus}
	q={data.q}
	basePath="/dashboard/customers/{page.params.id}/history"
/>
