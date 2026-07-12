<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { ShoppingCart } from '@lucide/svelte';
	import type { PageData } from './$types';
	import * as m from '$lib/paraglide/messages.js';

	let { data }: { data: PageData } = $props();

	let customer = $derived(data.customer);
	let orderCounts = $derived(data.orderCounts || []);
	let allMethods = $derived(data.allMethods || []);
	let allData = $derived(data.allData || []);
	let allItems = $derived(data.allItems || []);

	const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
		pending: {
			bg: 'bg-warning/10',
			text: 'text-warning-foreground',
			border: 'border-warning/20'
		},
		completed: {
			bg: 'bg-success/10',
			text: 'text-primary',
			border: 'border-primary/20'
		},
		cancelled: {
			bg: 'bg-destructive/10',
			text: 'text-destructive',
			border: 'border-destructive/20'
		},
		default: {
			bg: 'bg-muted',
			text: 'text-muted-foreground',
			border: 'border-border'
		}
	};

	function getStatusStyles(status: string) {
		return statusConfig[status?.toLowerCase?.() ?? ''] || statusConfig.default;
	}

	function getStatusLabel(status: string) {
		switch (status?.toLowerCase?.()) {
			case 'pending':
				return m.order_history_status_pending();
			case 'completed':
				return m.order_history_status_completed();
			case 'cancelled':
				return m.order_history_status_cancelled();
			case 'delivered':
				return m.order_history_status_delivered();
			case 'processing':
				return m.order_history_status_processing();
			case 'shipped':
				return m.order_history_status_shipped();
			default:
				return status;
		}
	}
</script>

<svelte:head>
	<title>{m.order_history_meta_title()}</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-7xl space-y-8 bg-background p-6 text-foreground">
	<header
		class="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-center md:justify-between"
	>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">
				{m.order_history_welcome_back({
					name: customer?.customerName ?? m.order_history_customer_fallback()
				})}
			</h1>
			<p class="mt-1 text-muted-foreground">
				{m.order_history_description()}
			</p>
		</div>
		<div class="flex gap-2">
			<Button href="/shop"><ShoppingCart /> {m.order_history_new_order()}</Button>
		</div>
	</header>

	<section aria-labelledby="metrics-title">
		<h2 id="metrics-title" class="sr-only">{m.order_history_metrics_title()}</h2>
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{#each orderCounts as metric}
				{@const styles = getStatusStyles(metric.status)}
				<div
					class="flex flex-row items-center justify-between space-y-0 rounded-xl border border-border bg-card p-6 pb-2 text-card-foreground shadow-sm"
				>
					<div class="space-y-1">
						<p class="text-sm font-medium tracking-tight text-muted-foreground capitalize">
							{m.order_history_metric_orders({ status: getStatusLabel(metric.status) })}
						</p>
						<div class="text-2xl font-bold">{metric.count}</div>
					</div>
					<div class={`h-4 w-4 rounded-full ${styles.bg} border ${styles.border}`}></div>
				</div>
			{/each}
		</div>
	</section>

	<div class="grid gap-6 md:grid-cols-3">
		<div
			class="rounded-xl border border-border bg-card text-card-foreground shadow-sm md:col-span-2"
		>
			<div class="p-6">
				<h3 class="text-lg leading-none font-semibold tracking-tight">
					{m.order_history_recent_orders_title()}
				</h3>
				<p class="mt-1 text-sm text-muted-foreground">
					{m.order_history_recent_orders_description()}
				</p>
			</div>
			<div class="overflow-x-auto border-t border-border">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
						<tr>
							<th class="p-4">{m.order_history_order_id()}</th>
							<th class="p-4">{m.order_history_customer()}</th>
							<th class="p-4">{m.order_history_date()}</th>
							<th class="p-4 text-right">{m.order_history_status()}</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#if allData.length === 0}
							<tr>
								<td colspan="4" class="p-8 text-center text-muted-foreground">
									{m.order_history_no_orders()}
								</td>
							</tr>
						{:else}
							{#each allData as order}
								{@const styles = getStatusStyles(order.status)}
								<tr class="transition-colors hover:bg-muted/40">
									<td class="p-4 font-mono text-xs text-muted-foreground">#{order.id}</td>
									<td class="p-4 font-medium">{order.name}</td>
									<td class="p-4 text-muted-foreground">{order.createdAt}</td>
									<td class="p-4 text-right">
										<span
											class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles.bg} ${styles.text} ${styles.border} capitalize`}
										>
											{getStatusLabel(order.status)}
										</span>
									</td>
								</tr>
							{/each}
						{/if}
					</tbody>
				</table>
			</div>
		</div>

		<div
			class="flex flex-col justify-between rounded-xl border border-border bg-card text-card-foreground shadow-sm"
		>
			<div>
				<div class="p-6">
					<h3 class="text-lg leading-none font-semibold tracking-tight">
						{m.order_history_payment_channels_title()}
					</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						{m.order_history_payment_channels_description()}
					</p>
				</div>
				<div class="space-y-4 p-6 pt-0">
					{#each allMethods as method}
						<div
							class="flex items-start gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-muted/30"
						>
							<div class="rounded-md bg-secondary p-2 text-secondary-foreground">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="18"
									height="18"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									<rect width="20" height="14" x="2" y="5" rx="2" />
									<line x1="2" x2="22" y1="10" y2="10" />
								</svg>
							</div>
							<div class="space-y-0.5">
								<p class="text-sm leading-none font-medium">{method.name}</p>
								<p class="text-xs text-muted-foreground">
									{method.description ?? m.order_history_no_description()}
								</p>
							</div>
						</div>
					{/each}
				</div>
			</div>
			<div class="rounded-b-xl border-t border-border bg-muted/20 p-6">
				<button
					class="w-full rounded-md border border-input bg-background px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
				>
					{m.order_history_manage_methods()}
				</button>
			</div>
		</div>
	</div>

	<div class="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
		<div class="p-6">
			<h3 class="text-lg leading-none font-semibold tracking-tight">
				{m.order_history_pending_breakdown_title()}
			</h3>
			<p class="mt-1 text-sm text-muted-foreground">
				{m.order_history_pending_breakdown_description()}
			</p>
		</div>
		<div class="overflow-x-auto border-t border-border">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-border bg-muted/50 font-medium text-muted-foreground">
					<tr>
						<th class="p-4">{m.order_history_product_name()}</th>
						<th class="p-4 text-center">{m.order_history_quantity()}</th>
						<th class="p-4 text-right">{m.order_history_unit_price()}</th>
						<th class="p-4 text-right">{m.order_history_total()}</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#if allItems.filter((i) => i.orderId !== null).length === 0}
						<tr>
							<td colspan="4" class="p-8 text-center text-muted-foreground">
								{m.order_history_no_pending_items()}
							</td>
						</tr>
					{:else}
						{#each allItems as item}
							{#if item.orderId}
								<tr class="transition-colors hover:bg-muted/40">
									<td class="p-4 font-medium">
										{item.product}
										<span class="mt-0.5 block font-mono text-xs text-muted-foreground">
											{m.order_history_id_label()}: {item.productId}
										</span>
									</td>
									<td class="p-4 text-center font-mono">{item.quantity}</td>
									<td class="p-4 text-right font-mono">ETB {item.price.toFixed(2)}</td>
									<td class="p-4 text-right font-mono font-semibold">ETB {item.total.toFixed(2)}</td
									>
								</tr>
							{/if}
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
