<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, Plus } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';

	import type { AddVariant } from './schema';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

	type Item = { value: number; name: string };

	let {
		data,
		colorItems = [],
		widthItems = [],
		thicknessItems = [],
		lengthItems = []
	}: {
		data: SuperValidated<Infer<AddVariant>>;
		colorItems?: Item[];
		widthItems?: Item[];
		thicknessItems?: Item[];
		lengthItems?: Item[];
	} = $props();

	const { form, errors, enhance, delayed, message } = superForm(data, {
		dataType: 'json'
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else toast.success($message.text);
		}
	});
</script>

<DialogComp title="Add Product Variant" variant="default" IconComp={Plus}>
	<div class="flex flex-col gap-4 pt-4">
		<form
			method="post"
			action="?/addVariant"
			use:enhance
			class="flex w-full flex-col gap-3"
			enctype="multipart/form-data"
		>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<InputComp
					{form}
					{errors}
					type="select"
					name="colorId"
					label="Colour"
					placeholder="Select colour"
					items={colorItems}
				/>
				<InputComp
					{form}
					{errors}
					type="select"
					name="widthId"
					label="Width"
					placeholder="Select width"
					items={widthItems}
				/>
				<InputComp
					{form}
					{errors}
					type="select"
					name="thicknessId"
					label="Thickness"
					placeholder="Select thickness"
					items={thicknessItems}
				/>
				<InputComp
					{form}
					{errors}
					type="select"
					name="lengthId"
					label="Length"
					placeholder="Select length"
					items={lengthItems}
				/>
			</div>

			<InputComp
				{form}
				{errors}
				type="text"
				name="sku"
				label="SKU"
				placeholder="e.g. PPGI-RED-0.5-1000"
			/>

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<InputComp
					{form}
					{errors}
					type="number"
					name="price"
					label="Price (ETB)"
					placeholder="Blank = quote only"
				/>
				<InputComp
					{form}
					{errors}
					type="number"
					name="quantity"
					label="Quantity"
					placeholder="0"
				/>
				<InputComp
					{form}
					{errors}
					type="number"
					name="reorderLevel"
					label="Reorder Level"
					placeholder="Notify level"
				/>
			</div>

			<InputComp
				{form}
				{errors}
				type="file"
				name="image"
				label="Variant Image"
				placeholder="Upload variant image"
			/>

			<Button type="submit" size="lg" disabled={$delayed}>
				{#if $delayed}
					<LoadingBtn name="Saving Variant" />
				{:else}
					<Save class="mr-2 h-4 w-4" /> Save Variant
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
