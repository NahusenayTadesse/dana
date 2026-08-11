<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ShieldCheckIcon, CheckCircle2, PackageIcon, Printer, Grid3x3 } from '@lucide/svelte';
	import { enhance } from '$app/forms';
	import OrderLinesTable, { type OrderLine } from '$lib/components/order-lines-table.svelte';
	import { downloadCSV, printElement } from '$lib/print';
	import * as m from '$lib/paraglide/messages.js';

	let { data, form } = $props();

	let showRejectForm = $state(false);
	let showCancelForm = $state(false);
	let rejectSubmitting = $state(false);
	let cancelSubmitting = $state(false);

	const formatPrice = (price: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ETB' }).format(price);

	// Same shape the printable receipt feeds OrderLinesTable, so both documents
	// format specs and align numbers identically.
	const tableLines = $derived<OrderLine[]>(
		data.items.map((item) => ({
			productName: item.productName,
			colorName: item.colorName,
			width: item.width,
			widthUnit: item.widthUnit,
			thickness: item.thickness,
			thicknessUnit: item.thicknessUnit,
			length: item.length,
			lengthUnit: item.lengthUnit,
			quantity: item.quantity ?? 0,
			unitPrice: Number(item.price ?? 0),
			lineTotal: Number(item.price ?? 0) * (item.quantity ?? 0)
		}))
	);

	let orderCard: HTMLDivElement | null = $state(null);
	const exportName = $derived(`dana-order-${data.order.id}`);

	function savePdf() {
		if (orderCard) printElement(orderCard, { fileName: exportName, orientation: 'portrait' });
	}

	function saveCsv() {
		downloadCSV(
			[
				[m.pay_order_number({ id: data.order.id })],
				[],
				['#', m.cart_col_product(), m.cart_col_qty(), m.cart_col_unit_price(), m.pay_subtotal()],
				...tableLines.map((l, i) => [
					i + 1,
					l.productName,
					l.quantity,
					l.unitPrice.toFixed(2),
					l.lineTotal.toFixed(2)
				]),
				[],
				[m.cart_col_total(), data.total.toFixed(2)]
			],
			exportName
		);
	}

	let choice = $state<'full' | 'advance'>(data.advanceAvailable ? 'advance' : 'full');
	const payAmount = $derived(
		data.isBalancePayment
			? data.remainingBalance
			: choice === 'advance'
				? data.advanceAmount
				: data.total
	);

	let submitting = $state(false);
</script>

<svelte:head>
	<title>{m.pay_meta_title()}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-16">
	<div
		bind:this={orderCard}
		class="rounded-2xl border border-border/80 bg-card/40 p-6 shadow-xs backdrop-blur-md"
	>
		<div class="mb-5 flex items-center justify-between gap-2 border-b border-border/60 pb-4">
			<div class="flex items-center gap-2">
				<PackageIcon class="size-5 text-primary" />
				<h1 class="text-lg font-bold">{m.pay_order_number({ id: data.order.id })}</h1>
			</div>
			<div class="flex items-center gap-2" data-print-hide>
				<Button variant="outline" size="sm" class="gap-1.5 text-xs" onclick={savePdf}>
					<Printer class="size-3.5" />
					{m.receipt_save_pdf()}
				</Button>
				<Button variant="outline" size="sm" class="gap-1.5 text-xs" onclick={saveCsv}>
					<Grid3x3 class="size-3.5" />
					{m.receipt_export_csv()}
				</Button>
			</div>
		</div>

		<div class="overflow-x-auto">
			<OrderLinesTable lines={tableLines} compact unitPriceLabel={m.cart_col_unit_price()} />
		</div>

		<div class="mt-5 space-y-1.5 border-t border-border/60 pt-4 text-sm">
			<div class="flex justify-between text-muted-foreground">
				<span>{m.pay_subtotal()}</span>
				<span class="font-mono">{formatPrice(Number(data.offer.subtotal))}</span>
			</div>
			{#if data.offer.discountAmount && Number(data.offer.discountAmount) > 0}
				<div class="flex justify-between text-muted-foreground">
					<span>{m.pay_discount()}</span>
					<span class="font-mono">-{formatPrice(Number(data.offer.discountAmount))}</span>
				</div>
			{/if}
			<div class="flex justify-between text-muted-foreground">
				<span>{m.pay_price_excl_vat()}</span>
				<span class="font-mono">{formatPrice(Number(data.offer.priceExcludingVat))}</span>
			</div>
			<div class="flex justify-between text-muted-foreground">
				<span>{m.pay_vat({ rate: Number(data.offer.vatRate) })}</span>
				<span class="font-mono">{formatPrice(Number(data.offer.vatAmount))}</span>
			</div>
			{#if data.offer.withholdingAmount && Number(data.offer.withholdingAmount) > 0}
				<div class="flex justify-between text-muted-foreground">
					<span>{m.pay_withholding({ rate: Number(data.offer.withholdingRate) })}</span>
					<span class="font-mono">-{formatPrice(Number(data.offer.withholdingAmount))}</span>
				</div>
			{/if}
			<div class="flex justify-between border-t border-border pt-2 text-lg font-bold">
				<span>{m.cart_col_total()}</span>
				<span class="text-primary">{formatPrice(data.total)}</span>
			</div>
		</div>

		{#if data.alreadyPaid}
			<div
				class="mt-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-400"
			>
				<CheckCircle2 class="size-5" />
				<span class="text-sm font-semibold">{m.pay_already_paid()}</span>
			</div>
		{:else if form?.rejected}
			<div
				class="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-400"
			>
				{m.pay_rejection_received()}
			</div>
		{:else if form?.cancelled}
			<div class="mt-6 rounded-xl border border-border p-4 text-sm text-muted-foreground">
				{m.pay_order_cancelled()}
			</div>
		{:else}
			<!-- data-print-hide: the payment controls are stripped from the printed
			     copy, which should read as a record of the order, not a form. -->
			<div data-print-hide>
				{#if form?.message}
					<p class="mt-4 text-sm text-destructive">{form.message}</p>
				{/if}

				{#if data.isBalancePayment}
					<div
						class="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400"
					>
						{m.pay_balance_note_before()}
						<strong>{formatPrice(data.amount)}</strong>
						{m.pay_balance_note_after()}
					</div>
				{/if}

				{#if data.advanceAvailable}
					<div class="mt-6 space-y-2">
						<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
							{m.pay_how_much()}
						</p>
						<label
							class="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm {choice ===
							'advance'
								? 'border-primary bg-primary/5'
								: 'border-border'}"
						>
							<span class="flex items-center gap-2">
								<input type="radio" name="choiceRadio" value="advance" bind:group={choice} />
								{m.pay_advance_payment({ percentage: data.advancePercentage })}
							</span>
							<span class="font-mono font-semibold">{formatPrice(data.advanceAmount)}</span>
						</label>
						<label
							class="flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm {choice ===
							'full'
								? 'border-primary bg-primary/5'
								: 'border-border'}"
						>
							<span class="flex items-center gap-2">
								<input type="radio" name="choiceRadio" value="full" bind:group={choice} />
								{m.pay_in_full()}
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
					<Button
						type="submit"
						class="mt-6 h-12 w-full rounded-xl text-sm font-semibold"
						disabled={submitting}
					>
						{submitting
							? m.pay_redirecting()
							: data.isBalancePayment
								? m.pay_remaining_balance({ amount: formatPrice(payAmount) })
								: m.pay_with_chapa({ amount: formatPrice(payAmount) })}
					</Button>
				</form>

				<p class="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
					<ShieldCheckIcon class="size-3.5 text-green-500" />
					{m.pay_secured_by_chapa()}
				</p>

				<!-- The only other exits from this page are Reject and Cancel, both
				     destructive. Someone who just wants to ask a question needs a
				     door that isn't one of those. -->
				<p class="mt-2 text-center text-xs text-muted-foreground">
					<a
						href="/contact-us?order={data.order.id}"
						class="font-medium text-primary underline-offset-4 hover:underline"
					>
						{m.pay_questions_contact_us()}
					</a>
				</p>

				<div class="mt-6 border-t border-border/60 pt-4">
					<p class="mb-2 text-center text-xs text-muted-foreground">{m.pay_not_happy()}</p>
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
							{m.pay_reject_offer()}
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
							{m.pay_cancel_order()}
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
								placeholder={m.pay_reject_reason_placeholder()}
								class="w-full rounded-lg border border-border bg-background p-2 text-sm"
							></textarea>
							<Button
								type="submit"
								variant="destructive"
								size="sm"
								class="w-full"
								disabled={rejectSubmitting}
							>
								{rejectSubmitting ? m.pay_sending() : m.pay_confirm_rejection()}
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
								placeholder={m.pay_cancel_reason_placeholder()}
								class="w-full rounded-lg border border-border bg-background p-2 text-sm"
							></textarea>
							<Button
								type="submit"
								variant="destructive"
								size="sm"
								class="w-full"
								disabled={cancelSubmitting}
							>
								{cancelSubmitting ? m.pay_cancelling() : m.pay_confirm_cancellation()}
							</Button>
						</form>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</div>
