<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { ArrowLeft, PackagePlus, Lock, TriangleAlert } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { enhance as svelteEnhance } from '$app/forms';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { formatETB } from '$lib/global.svelte';

	import LineForm from './LineForm.svelte';
	import DecideOrder from './DecideOrder.svelte';
	import SendOffer from './SendOffer.svelte';
	import OfferBuilder from './OfferBuilder.svelte';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import { lineColumns } from './lineColumns';
	import { can } from '$lib/permissions';

	let { data } = $props();

	const canEdit = $derived(can(data.access, 'quotes.edit'));
	const canSend = $derived(can(data.access, 'quotes.send'));
	const canApprove = $derived(can(data.access, 'quotes.approve'));

	const itemColumns = $derived(
		lineColumns({
			updateLineForm: data.updateLineForm,
			orderId: data.order?.id ?? 0,
			locked: !!data.lockReason || !canEdit,
			productList: data.productList,
			variantList: data.variantList,
			ratesByVariant: data.ratesByVariant,
			colorList: data.colorList
		})
	);

	let startingOrder = $state(false);

	const promoItems = $derived(
		(data.promoCodeList ?? []).map((p) => ({ value: p.id, name: `${p.code} (${p.discountPercentage}%)` }))
	);
</script>

<svelte:head>
	<title>Quote #{data.quote?.id} — Order & Price Offer</title>
</svelte:head>

<div class="mb-4 flex items-center justify-between">
	<Button href="/dashboard/quotes" variant="outline">
		<ArrowLeft class="h-4 w-4" /> Back to Quotes
	</Button>
</div>

<section class="mb-6 rounded-xl border border-border bg-background p-6">
	<h2 class="text-lg font-semibold">{data.quote?.name}</h2>
	<p class="text-sm text-muted-foreground">{data.quote?.email} · {data.quote?.phone}</p>
	{#if data.quote?.companyName}
		<p class="text-sm text-muted-foreground">{data.quote.companyName}</p>
	{/if}
	{#if data.quote?.message}
		<p class="mt-3 rounded-lg bg-muted/40 p-3 text-sm">{data.quote.message}</p>
	{/if}
</section>

{#if !data.order}
	<section class="mb-6 rounded-xl border border-dashed border-border p-6 text-center">
		<p class="mb-4 text-sm text-muted-foreground">
			No order linked to this quote yet{canEdit ? ' — start one to begin building a price offer' : ''}.
		</p>
		{#if canEdit}
			<form
				method="post"
				action="?/startOrder"
				use:svelteEnhance={() => {
					startingOrder = true;
					return async ({ result, update }) => {
						// Starting an order can now fail for a reason staff can act on
						// (a quote with no email address can't be turned into a
						// customer). Without this the action failed silently and the
						// button just stopped spinning.
						if (result.type === 'failure') {
							toast.error(
								(result.data?.message as string | undefined) ?? 'Could not start an order for this quote.'
							);
						}
						await update();
						startingOrder = false;
					};
				}}
			>
				<Button type="submit" disabled={startingOrder}>
					{#if startingOrder}
						<LoadingBtn name="Starting..." />
					{:else}
						<PackagePlus class="mr-2 h-4 w-4" /> Start Order
					{/if}
				</Button>
			</form>
		{/if}
	</section>
{:else}
	<section class="mb-6 flex items-center justify-between rounded-xl border border-border bg-background p-4">
		<div>
			<p class="text-sm font-medium">Order #{data.order.id}</p>
			<Statuses status={data.order.status ?? 'pending'} />
		</div>
		<DecideOrder
			data={data.decideForm}
			orderId={data.order.id}
			requestStatus={data.order.requestStatus}
			canDecide={canApprove}
		/>
	</section>

	{#if data.lockReason}
		<p class="mb-6 flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
			<Lock class="size-4 shrink-0" />
			{data.lockReason}
		</p>
	{/if}

	<section class="mb-6">
		<div class="mb-3 flex items-center justify-between">
			<h3 class="text-lg font-semibold">Order Lines</h3>
			{#if !data.lockReason && canEdit}
				<LineForm
					mode="add"
					data={data.addLineForm}
					orderId={data.order.id}
					productList={data.productList}
					variantList={data.variantList}
					ratesByVariant={data.ratesByVariant}
					colorList={data.colorList}
				/>
			{/if}
		</div>

		{#if data.items.length === 0}
			<p class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
				No lines yet — add at least one product before building a price offer.
			</p>
		{:else}
			<DataTable
				data={data.items}
				columns={itemColumns}
				fileName="quote-{data.quote?.id}-order-lines"
			/>
		{/if}
	</section>

	{#if !data.lockReason && canEdit}
		<section class="mb-6 rounded-xl border border-border bg-background p-6">
			<h3 class="mb-4 text-lg font-semibold">Build Price Offer</h3>
			<OfferBuilder data={data.saveOfferForm} orderId={data.order.id} {promoItems} />
		</section>
	{/if}

	<section class="mb-6">
		<h3 class="mb-3 text-lg font-semibold">Offer Revisions</h3>
		{#if data.offers.length === 0}
			<p class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No offers saved yet.</p>
		{:else}
			<div class="flex flex-col gap-3">
				{#each data.offers as offer (offer.id)}
					<div class="rounded-xl border border-border bg-background p-4">
						<div class="mb-2 flex items-center justify-between">
							<span class="font-semibold">Revision {offer.revision}</span>
							<Statuses status={offer.status} />
						</div>
						<div class="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
							<div>
								<p class="text-xs text-muted-foreground">Excl. VAT</p>
								<p class="font-medium">{formatETB(Number(offer.priceExcludingVat))}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Incl. VAT</p>
								<p class="font-medium">{formatETB(Number(offer.priceIncludingVat))}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Withholding</p>
								<p class="font-medium">{formatETB(Number(offer.withholdingAmount ?? 0))}</p>
							</div>
							<div>
								<p class="text-xs text-muted-foreground">Total Payable</p>
								<p class="font-bold text-primary">{formatETB(Number(offer.total))}</p>
							</div>
						</div>
						{#if offer.discountPercentage}
							<p class="mt-2 text-xs text-muted-foreground">
								Discount: {offer.discountPercentage}% ({formatETB(Number(offer.discountAmount ?? 0))})
							</p>
						{/if}
						<!-- The email and pay page always use the latest revision, so only it can be sent. -->
						{#if offer.id === data.latestOfferId}
							<div class="mt-3">
								{#if data.staleReason}
									<p class="flex items-center gap-2 text-sm text-destructive">
										<TriangleAlert class="size-4 shrink-0" />
										{data.staleReason}
									</p>
								{:else if data.sendBlockReason}
									<p class="text-sm text-muted-foreground">{data.sendBlockReason}</p>
								{:else if offer.status === 'rejected'}
									<p class="text-sm text-muted-foreground">
										The customer rejected this revision. Save a new revision to send.
									</p>
								{:else if canSend}
									<SendOffer data={data.sendOfferForm} priceOfferId={offer.id} revision={offer.revision} />
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</section>
{/if}
