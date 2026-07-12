<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Pen } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { InventoryAdjustmentForm } from '$lib/ZodSchema';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let {
		data,
		name = 'product'
	}: {
		data: SuperValidated<Infer<InventoryAdjustmentForm>>;
		name: string;
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
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
	<div class="flex flex-col items-center justify-center gap-4 pt-4">
		<form
			method="post"
			action="?/adjust"
			use:enhance
			class="flex w-full flex-col gap-3"
			enctype="multipart/form-data"
		>
			<InputComp
				label="Add or Remove"
				name="intent"
				type="select"
				required={true}
				{form}
				{errors}
				items={[
					{ value: 'add', name: '+ Add' },
					{ value: 'remove', name: '- Remove' }
				]}
			/>

			<InputComp
				label="Quantity of Change"
				name="quantity"
				type="number"
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
				placeholder="Enter Quantity"
				required={true}
			/>
			<InputComp
				label="Employee Responsible"
				name="employeeResponsible"
				type="text"
				{form}
				{errors}
				placeholder="Enter Quantity"
				required={true}
			/>

			{#if $form.intent === 'add'}
				<InputComp
					label="Cost per Unit"
					name="costPerItem"
					type="number"
					{form}
					{errors}
					placeholder="Enter Cost per Unit"
					required={true}
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

			<Button type="submit" variant="default" size="lg">
				{#if $delayed}
					<LoadingBtn name="Changing" />
				{:else}
					<Pen /> Change Quantity
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
