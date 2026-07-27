<script lang="ts">
	import { CheckCircle2, Clock, XCircle } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';

	let { data } = $props();
	let checking = $state(false);

	async function checkAgain() {
		checking = true;
		await invalidateAll();
		checking = false;
	}
</script>

<svelte:head>
	<title>Payment Status</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-24 text-center">
	{#if data.status === 'paid'}
		<CheckCircle2 class="mx-auto mb-4 size-12 text-emerald-500" />
		<h1 class="text-xl font-bold">Payment received</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Order #{data.orderId} is confirmed. A receipt has been sent to your email.
		</p>
	{:else if data.status === 'failed'}
		<XCircle class="mx-auto mb-4 size-12 text-rose-500" />
		<h1 class="text-xl font-bold">Payment didn't go through</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			No charge was completed for order #{data.orderId}. You can try again below.
		</p>
		<Button href="/pay/{data.token}" class="mt-6">Try Again</Button>
	{:else}
		<Clock class="mx-auto mb-4 size-12 text-primary" />
		<h1 class="text-xl font-bold">Confirming your payment</h1>
		<p class="mt-2 text-sm text-muted-foreground">{data.reason ?? 'This can take a moment.'}</p>
		<div class="mt-6 flex justify-center gap-2">
			<Button onclick={checkAgain} disabled={checking}>
				{checking ? 'Checking…' : 'Check again'}
			</Button>
			<Button href="/pay/{data.token}" variant="outline">Back to payment</Button>
		</div>
	{/if}
</div>