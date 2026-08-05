<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ShoppingCart } from '@lucide/svelte';
	import OrderHistoryTable from '$lib/components/OrderHistoryTable.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.order_history_meta_title()}</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-7xl space-y-8 bg-background p-6 text-foreground">
	<header class="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">
				{m.order_history_welcome_back({ name: data.customer?.customerName ?? m.order_history_customer_fallback() })}
			</h1>
			<p class="mt-1 text-muted-foreground">{m.order_history_description()}</p>
		</div>
		<div class="flex gap-2">
			<Button href="/shop"><ShoppingCart /> {m.order_history_new_order()}</Button>
		</div>
	</header>

	<section aria-labelledby="metrics-title">
		<h2 id="metrics-title" class="sr-only">{m.order_history_metrics_title()}</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each data.orderCounts as metric}
				<div class="flex flex-row items-center justify-between space-y-0 rounded-xl border border-border bg-card p-6 pb-2 text-card-foreground shadow-sm">
					<div class="space-y-1">
						<p class="text-sm font-medium tracking-tight text-muted-foreground capitalize">
							{m.order_history_metric_orders({ status: metric.status ?? '' })}
						</p>
						<div class="text-2xl font-bold">{metric.count}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section>
		<h2 class="mb-4 text-xl font-semibold tracking-tight">{m.order_history_recent_orders_title()}</h2>
		<OrderHistoryTable
			data={data.history}
			activeStatus={data.activeStatus}
			q={data.q}
			basePath="/account/history"
			requestAdjustmentData={data.requestAdjustmentForm}
		/>
	</section>
</div>
