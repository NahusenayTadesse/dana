<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	let pendingOrders = $derived(data.pendingOrders || []);

	function getTrackingStatusLabel(status: string) {
		switch (status?.toLowerCase?.()) {
			case 'pending':
				return m.tracking_status_pending();
			case 'completed':
				return m.tracking_status_completed();
			case 'cancelled':
				return m.tracking_status_cancelled();
			case 'delivered':
				return m.tracking_status_delivered();
			case 'processing':
				return m.tracking_status_processing();
			case 'shipped':
				return m.tracking_status_shipped();
			default:
				return status;
		}
	}
</script>

<svelte:head>
	<title>{m.tracking_meta_title()}</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-5xl space-y-8 bg-background p-6 text-foreground">
	<header class="border-b border-border pb-6">
		<div class="flex items-center gap-3">
			<span class="relative flex h-3 w-3">
				<span
					class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"
				></span>
				<span class="relative inline-flex h-3 w-3 rounded-full bg-primary"></span>
			</span>
			<h1 class="text-3xl font-bold tracking-tight">{m.tracking_heading()}</h1>
		</div>
		<p class="mt-1 text-muted-foreground">
			{m.tracking_description()}
		</p>
	</header>

	{#if pendingOrders.length === 0}
		<div
			class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-12 text-center text-card-foreground"
		>
			<div class="mb-4 rounded-full bg-muted p-3 text-muted-foreground">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="28"
					height="28"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<path d="m16 10-4 4-2-2" />
				</svg>
			</div>
			<h3 class="text-lg font-semibold">{m.tracking_empty_title()}</h3>
			<p class="mt-1 max-w-sm text-sm text-muted-foreground">
				{m.tracking_empty_description()}
			</p>
		</div>
	{:else}
		<div class="space-y-8">
			{#each pendingOrders as order}
				<div
					class="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm"
				>
					<div
						class="flex flex-col justify-between gap-4 border-b border-border bg-muted/30 p-6 sm:flex-row sm:items-center"
					>
						<div class="space-y-1">
							<div class="flex items-center gap-2">
								<span class="font-mono text-sm font-semibold text-muted-foreground">
									{m.tracking_order_id_label()}: #{order.id}
								</span>
								<span
									class="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary capitalize"
								>
									{getTrackingStatusLabel(order.status)}
								</span>
							</div>
							<p class="text-xs text-muted-foreground">
								{m.tracking_initiated_updated({
									createdAt: order.createdAt,
									updatedAt: order.updatedAt
								})}
							</p>
						</div>
						<div class="text-sm sm:text-right">
							<p class="text-xs font-medium text-muted-foreground">
								{m.tracking_estimated_expenditure()}
							</p>
							<p class="font-mono text-xl font-bold text-foreground">
								ETB {order.orderTotal.toFixed(2)}
							</p>
						</div>
					</div>

					<div class="border-b border-border bg-card p-6">
						<div
							class="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center md:gap-4"
						>
							<div
								class="absolute top-[18px] right-4 left-4 z-0 hidden h-0.5 bg-muted md:block"
							></div>
						</div>
					</div>

					<div class="bg-muted/10 p-6">
						<h4 class="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
							{m.tracking_shipment_manifest()}
						</h4>
						<ul
							class="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background"
						>
							{#each order.items as item}
								<li
									class="flex items-center justify-between p-4 text-sm transition-colors hover:bg-muted/30"
								>
									<div class="space-y-0.5">
										<p class="font-medium text-foreground">{item.productName}</p>
										<p class="font-mono text-xs text-muted-foreground">
											{m.tracking_quantity_short()}: {item.quantity} × ETB {item?.price}
										</p>
									</div>
									<span class="font-mono font-medium text-foreground">ETB {item?.total}</span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
