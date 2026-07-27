<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ShieldCheckIcon, CheckCircle2, PackageIcon } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Complete Your Payment</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-xl px-4 py-16">
	<div class="rounded-2xl border border-border/80 bg-card/40 p-6 shadow-xs backdrop-blur-md">
		<div class="mb-5 flex items-center gap-2 border-b border-border/60 pb-4">
			<PackageIcon class="size-5 text-primary" />
			<h1 class="text-lg font-bold">Order #{data.order.id}</h1>
		</div>

		<div class="divide-y divide-border/60">
			{#each data.items as item}
				<div class="flex items-center justify-between py-2.5 text-sm">
					<div>
						<span class="font-medium">{item.productName}</span>
						<span class="block text-xs text-muted-foreground">
							{[item.colorName, item.widthLabel || item.widthValue, item.thicknessValue]
								.filter(Boolean)
								.join(' · ')}
							· x{item.quantity}
						</span>
					</div>
					<span class="font-mono text-sm">{formatPrice(Number(item.price) * item.quantity)}</span>
				</div>
			{/each}
		</div>

		<div class="mt-4 flex justify-between border-t border-border pt-4 text-lg font-bold">
			<span>Total</span>
			<span class="text-primary">{formatPrice(data.amount)}</span>
		</div>

		{#if data.alreadyPaid}
			<div class="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
				<CheckCircle2 class="size-5" />
				<span class="text-sm font-semibold">This order has already been paid. Thank you!</span>
			</div>
		{:else}
			{#if form?.message}
				<p class="mt-4 text-sm text-destructive">{form.message}</p>
			{/if}

			<form
				method="post"
				action="?/pay"
				use:enhance={() => {
					submitting = true;
					return async ({ update }) => {
						await update();
						submitting = false;
					};
				}}
			>
				<Button type="submit" class="mt-6 h-12 w-full rounded-xl text-sm font-semibold" disabled={submitting}>
					{submitting ? 'Redirecting to Chapa…' : `Pay ${formatPrice(data.amount)} with Chapa`}
				</Button>
			</form>

			<p class="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
				<ShieldCheckIcon class="size-3.5 text-green-500" />
				Secured by Chapa
			</p>
		{/if}
	</div>
</div>