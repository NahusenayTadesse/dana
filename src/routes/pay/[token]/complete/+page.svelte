<script lang="ts">
	import { CheckCircle2, Clock, XCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	let checking = $state(false);

	const birr = new Intl.NumberFormat('en-ET', {
		style: 'currency',
		currency: 'ETB',
		maximumFractionDigits: 2
	});

	function formatBirr(value: number | undefined) {
		return birr.format(value ?? 0);
	}

	async function checkAgain() {
		checking = true;
		await invalidateAll();
		checking = false;
	}
</script>

<svelte:head>
	<title>{m.pay_status_meta_title()}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-24 text-center">
	{#if data.status === 'paid' && !data.fullySettled}
		<!-- An advance was collected but the order is NOT settled. Saying
		     "confirmed" here sent customers away believing they were done. -->
		<CheckCircle2 class="mx-auto mb-4 size-12 text-emerald-500" />
		<h1 class="text-xl font-bold">{m.pay_status_advance_title()}</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			{m.pay_status_advance_description({
				amount: formatBirr(data.amountPaid),
				id: String(data.orderId)
			})}
		</p>
		<p class="mt-4 rounded-md bg-muted px-4 py-3 text-sm font-medium">
			{m.pay_status_remaining_balance({ amount: formatBirr(data.remainingBalance) })}
		</p>
		<Button href="/pay/{data.token}" class="mt-6">{m.pay_status_pay_balance()}</Button>
	{:else if data.status === 'paid'}
		<CheckCircle2 class="mx-auto mb-4 size-12 text-emerald-500" />
		<h1 class="text-xl font-bold">{m.pay_status_paid_title()}</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			{m.pay_status_paid_description({ id: String(data.orderId) })}
		</p>
	{:else if data.status === 'failed'}
		<XCircle class="mx-auto mb-4 size-12 text-rose-500" />
		<h1 class="text-xl font-bold">{m.pay_status_failed_title()}</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			{m.pay_status_failed_description({ id: String(data.orderId) })}
		</p>
		<Button href="/pay/{data.token}" class="mt-6">{m.pay_status_try_again()}</Button>
	{:else}
		<Clock class="mx-auto mb-4 size-12 text-primary" />
		<h1 class="text-xl font-bold">{m.pay_status_pending_title()}</h1>
		<p class="mt-2 text-sm text-muted-foreground">{data.reason ?? m.pay_status_pending_hint()}</p>
		<div class="mt-6 flex justify-center gap-2">
			<Button onclick={checkAgain} disabled={checking}>
				{checking ? m.pay_status_checking() : m.pay_status_check_again()}
			</Button>
			<Button href="/pay/{data.token}" variant="outline">{m.pay_status_back()}</Button>
		</div>
	{/if}
</div>