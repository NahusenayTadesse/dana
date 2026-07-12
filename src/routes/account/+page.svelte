<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	let customer = $derived(data.customer);
	let metrics = $derived(data.metrics);
	let recentActivity = $derived(data.recentActivity || []);
	let activeDiscounts = $derived(data.activeDiscounts || []);

	let pendingCount = $derived(metrics.counts.find((c) => c.status === 'pending')?.count || 0);
	let deliveredCount = $derived(metrics.counts.find((c) => c.status === 'delivered')?.count || 0);

	const paymentStyles: Record<string, { bg: string; text: string; border: string }> = {
		paid: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
		pending: { bg: 'bg-warning/10', text: 'text-warning-foreground', border: 'border-warning/20' },
		unpaid: { bg: 'bg-destructive/10', text: 'text-destructive', border: 'border-destructive/20' },
		refunded: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
		disputed: {
			bg: 'bg-destructive/20',
			text: 'text-destructive font-bold',
			border: 'border-destructive/40'
		}
	};

	function getPaymentStyle(status: string) {
		return paymentStyles[status?.toLowerCase?.() ?? ''] || paymentStyles.pending;
	}

	function getFulfillmentStatusLabel(status: string) {
		switch (status?.toLowerCase?.()) {
			case 'pending':
				return m.account_status_pending();
			case 'delivered':
				return m.account_status_delivered();
			case 'processing':
				return m.account_status_processing();
			case 'cancelled':
				return m.account_status_cancelled();
			case 'shipped':
				return m.account_status_shipped();
			case 'completed':
				return m.account_status_completed();
			default:
				return status;
		}
	}

	function getPaymentStatusLabel(status: string) {
		switch (status?.toLowerCase?.()) {
			case 'paid':
				return m.account_payment_paid();
			case 'pending':
				return m.account_payment_pending();
			case 'unpaid':
				return m.account_payment_unpaid();
			case 'refunded':
				return m.account_payment_refunded();
			case 'disputed':
				return m.account_payment_disputed();
			default:
				return status;
		}
	}
</script>

<svelte:head>
	<title>{m.account_overview_meta_title()}</title>
</svelte:head>

<div class="mx-auto min-h-screen max-w-7xl space-y-8 bg-background p-6 text-foreground">
	<header class="flex flex-col gap-1 border-b border-border pb-6">
		<h1 class="text-3xl font-bold tracking-tight">{m.account_overview_heading()}</h1>
		<p class="text-muted-foreground">
			{m.account_overview_greeting({
				name: customer?.name ?? m.account_overview_valued_customer()
			})}
		</p>
	</header>

	<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">{m.account_settled_expenditures()}</p>
			<div class="mt-2 font-mono text-3xl font-bold tracking-tight text-primary">
				ETB {metrics.totalSpent.toFixed(2)}
			</div>
			<p class="mt-1 text-xs text-muted-foreground">{m.account_settled_payments_detail()}</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">{m.account_outstanding_dues()}</p>
			<div
				class="mt-2 font-mono text-3xl font-bold tracking-tight {metrics.totalOutstanding > 0
					? 'text-destructive'
					: 'text-muted-foreground'}"
			>
				ETB {metrics.totalOutstanding.toFixed(2)}
			</div>
			<p class="mt-1 text-xs text-muted-foreground">{m.account_outstanding_dues_detail()}</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">{m.account_processing_orders()}</p>
			<div class="mt-2 text-3xl font-bold tracking-tight">{pendingCount}</div>
			<p class="mt-1 text-xs text-muted-foreground">{m.account_processing_orders_detail()}</p>
		</div>

		<div class="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
			<p class="text-sm font-medium text-muted-foreground">{m.account_completed_deliveries()}</p>
			<div class="mt-2 text-3xl font-bold tracking-tight">{deliveredCount}</div>
			<p class="mt-1 text-xs text-muted-foreground">{m.account_completed_deliveries_detail()}</p>
		</div>
	</section>

	<div class="grid gap-6 lg:grid-cols-3">
		<div
			class="rounded-xl border border-border bg-card text-card-foreground shadow-sm lg:col-span-2"
		>
			<div class="p-6">
				<h2 class="text-lg leading-none font-semibold tracking-tight">
					{m.account_recent_orders_title()}
				</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					{m.account_recent_transactions_description()}
				</p>
			</div>

			<div class="divide-y divide-border border-t border-border">
				{#if recentActivity.length === 0}
					<div class="p-8 text-center text-sm text-muted-foreground">
						{m.account_no_transactions()}
					</div>
				{:else}
					{#each recentActivity as activity}
						{@const payStyle = getPaymentStyle(activity.paymentStatus)}
						<div class="space-y-4 p-6 transition-colors hover:bg-muted/20">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<div class="flex items-center gap-3">
									<span class="font-mono text-sm font-semibold">
										{m.account_order_number({ id: activity.id })}
									</span>
									<span
										class="inline-flex items-center rounded-full border bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground uppercase"
									>
										{m.account_fulfillment_prefix()}
										{getFulfillmentStatusLabel(activity.status)}
									</span>
									<span
										class={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase ${payStyle.bg} ${payStyle.text} ${payStyle.border}`}
									>
										{m.account_payment_prefix()}
										{getPaymentStatusLabel(activity.paymentStatus)}
									</span>
								</div>

								<div class="flex items-center gap-4">
									<span class="font-mono text-base font-bold">ETB {activity.amount.toFixed(2)}</span
									>
									{#if activity.receiptLink}
										<a
											href={activity.receiptLink}
											target="_blank"
											rel="noopener noreferrer"
											class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="14"
												height="14"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
											>
												<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
												<polyline points="7 10 12 15 17 10" />
												<line x1="12" x2="12" y1="15" y2="3" />
											</svg>
											{m.account_receipt()}
										</a>
									{/if}
								</div>
							</div>

							<div class="rounded-lg border border-border bg-muted/40 p-3">
								<ul class="space-y-1.5 divide-y divide-border/50 text-xs">
									{#each activity.items as item}
										<li class="flex items-center justify-between pt-1.5 first:pt-0">
											<span class="font-medium text-muted-foreground">
												{item.name} <span class="text-foreground/70">× {item.qty}</span>
											</span>
											<span class="font-mono">ETB {(item.price * item.qty).toFixed(2)}</span>
										</li>
									{/each}
								</ul>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>

		<div class="space-y-6">
			<div class="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
				<div class="p-6">
					<h2 class="text-lg leading-none font-semibold tracking-tight">
						{m.account_offers_title()}
					</h2>
					<p class="mt-1 text-sm text-muted-foreground">
						{m.account_offers_description()}
					</p>
				</div>

				<div class="space-y-4 p-6 pt-0">
					{#if activeDiscounts.length === 0}
						<p class="py-4 text-center text-xs text-muted-foreground">
							{m.account_no_offers()}
						</p>
					{:else}
						{#each activeDiscounts as discount}
							<div
								class="relative flex flex-col justify-between space-y-3 overflow-hidden rounded-lg border border-primary/20 bg-primary/5 p-4"
							>
								<div class="space-y-1">
									<div class="flex items-center justify-between">
										<h3 class="text-sm font-bold tracking-tight text-foreground">
											{discount.name}
										</h3>
										<span
											class="inline-flex items-center rounded bg-primary px-1.5 py-0.5 font-mono text-xs font-bold text-primary-foreground"
										>
											-ETB{Number(discount.amount).toFixed(0)}
										</span>
									</div>
									<p class="text-xs leading-relaxed text-muted-foreground">
										{discount.description ?? m.account_no_details_provided()}
									</p>
								</div>
								{#if discount.productName}
									<div
										class="w-fit rounded border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground"
									>
										{m.account_applies_to()}
										<span class="font-medium text-foreground">
											{discount.productName}
										</span>
									</div>
								{/if}
							</div>
						{/each}
					{/if}
				</div>
			</div>

			<div class="space-y-2 rounded-xl border border-border bg-muted/40 p-6 text-card-foreground">
				<h3 class="text-sm font-semibold">{m.account_need_assistance_title()}</h3>
				<p class="text-xs leading-normal text-muted-foreground">
					{m.account_need_assistance_description()}
				</p>
				<div class="pt-2">
					<Button href="/contact-us" variant="link">
						{m.account_contact_support_representative()} &rarr;
					</Button>
				</div>
			</div>
		</div>
	</div>
</div>
