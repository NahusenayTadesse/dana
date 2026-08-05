<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, ReceiptText } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import DecideAdjustment from './DecideAdjustment.svelte';
	import { formatETB } from '$lib/global.svelte';
	import type { AddAdjustment, DecideAdjustment as DecideAdjustmentType } from './schema';

	type Adjustment = {
		id: number;
		orderId: number;
		type: 'addition' | 'deduction';
		amount: string;
		reason: string;
		notes: string | null;
		causedBy: 'customer' | 'company';
		status: 'pending' | 'approved' | 'rejected';
		createdAt: Date | string;
	};

	type Totals = {
		priceExcludingVat: number;
		vatRate: number;
		vatAmount: number;
		priceIncludingVat: number;
		withholdingRate: number;
		withholdingAmount: number;
		total: number;
	} | null;

	let {
		orderId,
		adjustments = [],
		currentTotals,
		addData,
		decideData
	}: {
		orderId: number;
		adjustments?: Adjustment[];
		currentTotals: Totals;
		addData: SuperValidated<Infer<AddAdjustment>>;
		decideData: SuperValidated<Infer<DecideAdjustmentType>>;
	} = $props();

	const typeItems = [
		{ value: 'addition', name: 'Addition (customer owes more)' },
		{ value: 'deduction', name: 'Deduction (credit / refund)' }
	];

	const { form, errors, enhance, delayed, message } = superForm(addData, {
		id: `add-adjustment-${orderId}`,
		dataType: 'json',
		resetForm: false
	});
	$form.orderId = orderId;

	$effect(() => {
		if ($message) $message.type === 'error' ? toast.error($message.text) : toast.success($message.text);
	});

	// Live preview of the new total, using the same VAT-exclusive-adjustment
	// math as getAdjustedOrderTotals() server-side.
	const preview = $derived.by(() => {
		if (!currentTotals || !$form.amount) return null;
		const delta = ($form.type === 'deduction' ? -1 : 1) * Number($form.amount || 0);
		const priceExcludingVat = currentTotals.priceExcludingVat + delta;
		const vatAmount = priceExcludingVat * (currentTotals.vatRate / 100);
		const priceIncludingVat = priceExcludingVat + vatAmount;
		const withholdingAmount = priceExcludingVat * (currentTotals.withholdingRate / 100);
		const total = priceIncludingVat - withholdingAmount;
		return { priceExcludingVat, vatAmount, priceIncludingVat, withholdingAmount, total };
	});

</script>

<DialogComp title="Adjustments — Order #{orderId}" variant="outline" IconComp={ReceiptText} size="lg">
	<div class="flex flex-col gap-6 pt-4">
		{#if currentTotals}
			<div class="rounded-lg border p-3 text-sm">
				<p class="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Current Total</p>
				<div class="grid grid-cols-2 gap-1">
					<span class="text-muted-foreground">Excl. VAT</span>
					<span class="text-right font-mono">{formatETB(currentTotals.priceExcludingVat)}</span>
					<span class="text-muted-foreground">VAT ({currentTotals.vatRate}%)</span>
					<span class="text-right font-mono">{formatETB(currentTotals.vatAmount)}</span>
					<span class="text-muted-foreground">Withholding ({currentTotals.withholdingRate}%)</span>
					<span class="text-right font-mono">-{formatETB(currentTotals.withholdingAmount)}</span>
					<span class="font-semibold">Total</span>
					<span class="text-right font-mono font-semibold text-primary">{formatETB(currentTotals.total)}</span>
				</div>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			<h3 class="text-sm font-medium text-muted-foreground">History</h3>
			{#if adjustments.length === 0}
				<p class="text-sm text-muted-foreground italic">No adjustments yet.</p>
			{:else}
				<div class="flex flex-col divide-y rounded-lg border">
					{#each adjustments as adj (adj.id)}
						<div class="flex items-start justify-between gap-3 p-3 text-sm">
							<div>
								<p class="font-medium">
									{adj.type === 'addition' ? '+' : '-'}{formatETB(Number(adj.amount))}
									<span class="text-xs text-muted-foreground">({adj.causedBy})</span>
								</p>
								<p class="text-xs text-muted-foreground">{adj.reason}</p>
								{#if adj.notes}
									<p class="mt-1 text-xs whitespace-pre-line text-muted-foreground">{adj.notes}</p>
								{/if}
							</div>
							<div class="flex shrink-0 flex-col items-end gap-1.5">
								<span
									class="rounded-full px-2 py-0.5 text-[11px] font-semibold {adj.status === 'approved'
										? 'bg-emerald-500/10 text-emerald-600'
										: adj.status === 'rejected'
											? 'bg-destructive/10 text-destructive'
											: 'bg-amber-500/10 text-amber-600'}"
								>
									{adj.status}
								</span>
								{#if adj.status === 'pending'}
									<DecideAdjustment data={decideData} adjustmentId={adj.id} />
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex flex-col gap-3 border-t pt-4">
			<h3 class="text-sm font-medium text-muted-foreground">Add Adjustment</h3>
			<form method="post" action="?/addAdjustment" use:enhance class="flex flex-col gap-3">
				<input type="hidden" name="orderId" bind:value={$form.orderId} />

				<InputComp {form} {errors} type="select" name="type" label="Type" placeholder="Select type" items={typeItems} />
				<InputComp {form} {errors} type="number" name="amount" label="Amount (ETB)" placeholder="0.00" />
				<InputComp {form} {errors} type="text" name="reason" label="Reason" placeholder="e.g. Freight surcharge, damaged item credit" />
				<InputComp {form} {errors} type="textarea" name="notes" label="Notes (optional)" placeholder="Additional detail" />

				{#if preview}
					<div class="rounded-lg border border-dashed p-3 text-sm">
						<p class="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">New Total (preview)</p>
						<div class="grid grid-cols-2 gap-1">
							<span class="text-muted-foreground">Excl. VAT</span>
							<span class="text-right font-mono">{formatETB(preview.priceExcludingVat)}</span>
							<span class="text-muted-foreground">VAT</span>
							<span class="text-right font-mono">{formatETB(preview.vatAmount)}</span>
							<span class="text-muted-foreground">Withholding</span>
							<span class="text-right font-mono">-{formatETB(preview.withholdingAmount)}</span>
							<span class="font-semibold">Total</span>
							<span class="text-right font-mono font-semibold text-primary">{formatETB(preview.total)}</span>
						</div>
						{#if $form.type === 'addition'}
							<p class="mt-2 text-xs text-muted-foreground">
								A payment link for the extra amount will be sent to the customer automatically.
							</p>
						{:else}
							<p class="mt-2 text-xs text-muted-foreground">
								No payment link is sent — if the customer already paid more than the new total, refund it your usual way.
							</p>
						{/if}
					</div>
				{/if}

				<Button type="submit" size="lg" disabled={$delayed}>
					{#if $delayed}
						<LoadingBtn name="Applying" />
					{:else}
						<Save class="mr-2 h-4 w-4" /> Apply Adjustment
					{/if}
				</Button>
			</form>
		</div>
	</div>
</DialogComp>
