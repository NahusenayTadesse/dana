<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import type { saveOffer } from './schema';

	type Item = { value: number; name: string };

	let {
		data,
		orderId,
		promoItems = []
	}: {
		data: SuperValidated<Infer<typeof saveOffer>>;
		orderId: number;
		promoItems?: Item[];
	} = $props();

	// Its own component, mounted only once an order exists: created at page
	// mount instead, the form kept orderId 0 after "Start Order", and saving
	// said "Add at least one line" against an order that had lines.
	const {
		form: offerForm,
		errors: offerErrors,
		enhance: offerEnhance,
		delayed: offerDelayed,
		message: offerMessage,
		allErrors: offerAllErrors
	} = untrack(() => superForm(data, { id: `save-offer-${orderId}`, resetForm: false }));

	untrack(() => {
		$offerForm.orderId = orderId;
	});

	$effect(() => {
		if ($offerMessage) {
			if ($offerMessage.type === 'error') toast.error($offerMessage.text);
			else toast.success($offerMessage.text);
		}
	});
</script>

<form method="post" action="?/saveOffer" use:offerEnhance class="flex flex-col gap-4">
	<Errors allErrors={$offerAllErrors} />
	<input type="hidden" name="orderId" bind:value={$offerForm.orderId} />

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<InputComp
			form={offerForm}
			errors={offerErrors}
			type="number"
			name="discountPercentage"
			label="Sales Discount %"
			placeholder="0"
		/>
		<InputComp
			form={offerForm}
			errors={offerErrors}
			type="select"
			name="promoCodeId"
			label="Promo Code"
			placeholder="No promo code"
			items={promoItems}
		/>
	</div>

	<InputComp
		form={offerForm}
		errors={offerErrors}
		type="text"
		name="paymentTerms"
		label="Payment Terms"
		placeholder="e.g. Net 30, 50% advance"
	/>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<InputComp
			form={offerForm}
			errors={offerErrors}
			type="number"
			name="validityDays"
			label="Offer Validity (days)"
			placeholder="e.g. 14"
		/>
		<InputComp
			form={offerForm}
			errors={offerErrors}
			type="number"
			name="advancePaymentPercentage"
			label="Advance Payment %"
			placeholder="100"
		/>
	</div>

	<Button type="submit" size="lg" disabled={$offerDelayed}>
		{#if $offerDelayed}
			<LoadingBtn name="Calculating & Saving" />
		{:else}
			<Plus class="mr-2 h-4 w-4" /> Save New Offer Revision
		{/if}
	</Button>
</form>
