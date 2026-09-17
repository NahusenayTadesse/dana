<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Pen } from '@lucide/svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { AdjustForm } from '../../routes/dashboard/products/single/[id]/schema';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

	type Item = { value: number; name: string };

	let {
		data,
		name = 'product',
		variants = []
	}: {
		data: SuperValidated<AdjustForm>;
		name: string;
		/** The product's variants — stock is kept per variant, per warehouse. */
		variants?: Item[];
	} = $props();

	const { form, errors, enhance, delayed, message } = superForm(
		untrack(() => data),
		{}
	);

	// Stock lives on variants: with only one there is nothing to choose.
	$effect(() => {
		if (variants.length === 1 && !$form.variantId) {
			$form.variantId = variants[0].value;
		}
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
</script>

<DialogComp variant="default" title="Change Quantity of {name}" IconComp={Pen}>
	<h5 class="text-center">Change {name} Quantity</h5>
	{#if variants.length === 0}
		<p class="pt-4 text-center text-sm text-muted-foreground">
			Stock is kept per variant. Add a variant to this product first.
		</p>
	{:else}
		<div class="flex flex-col items-center justify-center gap-4 pt-4">
			<form
				method="post"
				action="?/adjust"
				use:enhance
				class="flex w-full flex-col gap-3"
				enctype="multipart/form-data"
			>
				<InputComp
					label="Variant"
					name="variantId"
					type="select"
					required={true}
					{form}
					{errors}
					items={variants}
				/>

				<InputComp
					label="Add or Remove"
					name="intent"
					type="select"
					required={true}
					{form}
					{errors}
					items={[
						{ value: 'add', name: '+ Add (to the default warehouse)' },
						{ value: 'remove', name: '- Remove' }
					]}
				/>

				<InputComp
					label="Quantity of Change"
					name="quantity"
					type="number"
					min="1"
					{form}
					{errors}
					placeholder="Enter Quantity"
					required={true}
				/>
				<InputComp
					label="Reason"
					name="reason"
					type="textarea"
					{form}
					{errors}
					placeholder="Why is the stock changing?"
				/>
				<InputComp
					label="Employee Responsible"
					name="employeeResponsible"
					type="text"
					{form}
					{errors}
					placeholder="Enter Employee Name"
					required={true}
				/>

				{#if $form.intent === 'add'}
					<InputComp
						label="Cost per Unit"
						name="costPerItem"
						type="number"
						min="0"
						{form}
						{errors}
						placeholder="Enter Cost per Unit"
					/>
					<InputComp
						label="Reciept of Change"
						name="reciept"
						type="file"
						{form}
						{errors}
						required={false}
					/>
				{/if}

				<Button type="submit" variant="default" size="lg" disabled={$delayed}>
					{#if $delayed}
						<LoadingBtn name="Changing" />
					{:else}
						<Pen /> Change Quantity
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</DialogComp>
