<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ShieldCheckIcon, CheckCircle2, PackageIcon } from '@lucide/svelte';
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	let showRejectForm = $state(false);
	let showCancelForm = $state(false);
	let rejectSubmitting = $state(false);
	let cancelSubmitting = $state(false);

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	const specLabel = (item: (typeof data.items)[number]) =>
		[
			item.colorName,
			item.width != null ? `${item.width}${item.widthUnit ?? ''}` : null,
			item.thickness != null ? `${item.thickness}${item.thicknessUnit === 'gauge' ? 'ga' : item.thicknessUnit}` : null,
			item.length != null ? `${item.length}${item.lengthUnit ?? ''}` : null
		]
			.filter(Boolean)
			.join(' · ');

	let choice = $state<'full' | 'advance'>(data.advanceAvailable ? 'advance' : 'full');
	const payAmount = $derived(
		data.isBalancePayment ? data.remainingBalance : choice === 'advance' ? data.advanceAmount : data.total
	);

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Complete Your Payment</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-16">
	<div class="rounded-2xl border border-border/80 bg-card/40 p-6 shadow-xs backdrop-blur-md">
		<div class="mb-5 flex items-center gap-2 border-b border-border/60 pb-4">
			<PackageIcon class="size-5 text-primary" />
			<h1 class="text-lg font-bold">Order #{data.order.id}</h1>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full min-w-[480px] border-collapse text-sm">
				<thead>
					<tr class="border-b border-border/60 text-left text-xs text-muted-foreground uppercase">
						<th class="pb-2 font-medium">Item</th>
						<th class="pb-2 text-right font-medium">Qty</th>
						<th class="pb-2 text-right font-medium">Unit Price</th>
						<th class="pb-2 text-right font-medium">Subtotal</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border/60">
					{#each data.items as item}
						<tr>
							<td class="py-2.5">
								<span class="font-medium">{item.productName}</span>
								{#if specLabel(item)}
									<span class="block text-xs text-muted-foreground">{specLabel(item)}</span>
								{/if}
							</td>
							<td class="py-2.5 text-right">{item.quantity}</td>
							<td class="py-2.5 text-right font-mono">{formatPrice(Number(item.price ?? 0))}</td>
							<td class="py-2.5 text-right font-mono">{formatPrice(Number(item.price ?? 0) * (item.quantity ?? 0))}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="mt-5 space-y-1.5 border-t border-border/60 pt-4 text-sm">
			<div class="flex justify-between text-muted-foreground">
				<span>Subtotal</span>
				<span class="font-mono">{formatPrice(Number(data.offer.subtotal))}</span>
			</div>
			{#if data.offer.discountAmount && Number(data.offer.discountAmount) > 0}
				<div class="flex justify-between text-muted-foreground">
					<span>Discount</span>
					<span class="font-mono">-{formatPrice(Number(data.offer.discountAmount))}</span>
				</div>
			{/if}
			<div class="flex justify-between text-muted-foreground">
				<span>Price (excl. VAT)</span>
				<span class="font-mono">{formatPrice(Number(data.offer.priceExcludingVat))}</span>
			</div>
			<div class="flex justify-between text-muted-foreground">
				<span>VAT ({Number(data.offer.vatRate)}%)</span>
				<span class="font-mono">{formatPrice(Number(data.offer.vatAmount))}</span>
			</div>
			{#if data.offer.withholdingAmount && Number(data.offer.withholdingAmount) > 0}
				<div class="flex justify-between text-muted-foreground">
					<span>Withholding ({Number(data.offer.withholdingRate)}%)</span>
					<span class="font-mono">-{formatPrice(Number(data.offer.withholdingAmount))}</span>
				</div>
			{/if}
			<div class="flex justify-between border-t border-border pt-2 text-lg font-bold">
				<span>Total</span>
				<span class="text-primary">{formatPrice(data.total)}</span>
			</div>
		</div>

		{#if data.alreadyPaid}
			<div class="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400">
				<CheckCircle2 class="size-5" />
				<span class="text-sm font-semibold">This order has already been paid. Thank you!</span>
			</div>
		{:else if form?.rejected}
			<div class="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400">
				We've received your rejection. Our team will follow up with a new offer shortly.
			</div>
		{:else if form?.cancelled}
			<div class="mt-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">
				This order has been cancelled at your request.
			</div>
		{:else}
			{#if form?.message}
				<p class="mt-4 text-sm text-destructive">{form.message}</p>
			{/if}

			{#if data.isBalancePayment}
				<div class="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
					An amount of <strong>{formatPrice(data.amount)}</strong> has already been paid on this order. This link
					settles the remaining balance.
				</div>
			{/if}

			{#if data.advanceAvailable}
				<div class="mt-6 space-y-2">
					<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">How much would you like to pay?</p>
					<label
						class="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm {choice === 'advance'
							? 'border-primary bg-primary/5'
							: 'border-border'}"
					>
						<span class="flex items-center gap-2">
							<input type="radio" name="choiceRadio" value="advance" bind:group={choice} />
							Advance payment ({data.advancePercentage}%)
						</span>
						<span class="font-mono font-semibold">{formatPrice(data.advanceAmount)}</span>
					</label>
					<label
						class="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm {choice === 'full'
							? 'border-primary bg-primary/5'
							: 'border-border'}"
					>
						<span class="flex items-center gap-2">
							<input type="radio" name="choiceRadio" value="full" bind:group={choice} />
							Pay in full
						</span>
						<span class="font-mono font-semibold">{formatPrice(data.total)}</span>
					</label>
				</div>
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
				<input type="hidden" name="choice" value={choice} />
				<Button type="submit" class="mt-6 h-12 w-full rounded-xl text-sm font-semibold" disabled={submitting}>
					{submitting
						? 'Redirecting to Chapa…'
						: data.isBalancePayment
							? `Pay Remaining Balance ${formatPrice(payAmount)}`
							: `Pay ${formatPrice(payAmount)} with Chapa`}
				</Button>
			</form>

			<p class="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
				<ShieldCheckIcon class="size-3.5 text-green-500" />
				Secured by Chapa
			</p>

			<div class="mt-6 border-t border-border/60 pt-4">
				<p class="mb-2 text-center text-xs text-muted-foreground">Not happy with this offer?</p>
				<div class="flex justify-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							showRejectForm = !showRejectForm;
							showCancelForm = false;
						}}
					>
						Reject Offer &amp; Request New One
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onclick={() => {
							showCancelForm = !showCancelForm;
							showRejectForm = false;
						}}
					>
						Cancel Order
					</Button>
				</div>

				{#if showRejectForm}
					<form
						method="post"
						action="?/rejectOffer"
						class="mt-3 space-y-2"
						use:enhance={() => {
							rejectSubmitting = true;
							return async ({ update }) => {
								await update();
								rejectSubmitting = false;
							};
						}}
					>
						<textarea
							name="reason"
							rows="2"
							placeholder="Optional — tell us what you'd like changed"
							class="w-full rounded-lg border border-border bg-background p-2 text-sm"
						></textarea>
						<Button type="submit" variant="destructive" size="sm" class="w-full" disabled={rejectSubmitting}>
							{rejectSubmitting ? 'Sending…' : 'Confirm Rejection'}
						</Button>
					</form>
				{/if}

				{#if showCancelForm}
					<form
						method="post"
						action="?/cancelOrder"
						class="mt-3 space-y-2"
						use:enhance={() => {
							cancelSubmitting = true;
							return async ({ update }) => {
								await update();
								cancelSubmitting = false;
							};
						}}
					>
						<textarea
							name="reason"
							rows="2"
							placeholder="Optional — let us know why"
							class="w-full rounded-lg border border-border bg-background p-2 text-sm"
						></textarea>
						<Button type="submit" variant="destructive" size="sm" class="w-full" disabled={cancelSubmitting}>
							{cancelSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
						</Button>
					</form>
				{/if}
			</div>
		{/if}
	</div>
</div>
