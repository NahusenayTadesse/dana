<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { SquarePen, Save, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';

	import type { EditVariant } from './schema';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

	type Item = { value: number; name: string };
	type Variant = {
		id: number;
		colorId: number | null;
		widthId: number | null;
		thicknessId: number | null;
		lengthId: number | null;
		sku: string | null;
		price: string | number | null;
		quantity: number;
		reorderLevel: number | null;
	};

	let {
		data,
		variant,
		colorItems = [],
		widthItems = [],
		thicknessItems = [],
		lengthItems = []
	}: {
		data: SuperValidated<Infer<EditVariant>>;
		variant: Variant;
		colorItems?: Item[];
		widthItems?: Item[];
		thicknessItems?: Item[];
		lengthItems?: Item[];
	} = $props();

	const { form, errors, enhance, delayed, message } = superForm(data, {
		dataType: 'json'
	});

	// Prefill this row's values (runs once on mount). With dataType: 'json'
	// these go straight to the server — no hidden inputs needed.
	$form.id = variant.id;
	$form.colorId = variant.colorId;
	$form.widthId = variant.widthId;
	$form.thicknessId = variant.thicknessId;
	$form.lengthId = variant.lengthId;
	$form.sku = variant.sku;
	$form.price = variant.price != null ? Number(variant.price) : null;
	$form.quantity = variant.quantity;
	$form.reorderLevel = variant.reorderLevel;

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else toast.success($message.text);
		}
	});
</script>

<DialogComp title={variant.sku ?? 'Edit Variant'} variant="ghost" IconComp={SquarePen}>
	<div class="flex flex-col gap-4 pt-4">
		<form
			method="post"
			action="?/editVariant"
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
				label="Variant Image (leave empty to keep current)"
				placeholder="Upload new variant image"
			/>

			<div class="flex flex-wrap gap-2">
				<Button type="submit" size="lg" disabled={$delayed}>
					{#if $delayed}
						<LoadingBtn name="Saving" />
					{:else}
						<Save class="mr-2 h-4 w-4" /> Save Changes
					{/if}
				</Button>

				<!-- Same superform, different server action -->
				<Button
					type="submit"
					variant="destructive"
					size="lg"
					formaction="?/deleteVariant"
					disabled={$delayed}
				>
					<Trash2 class="mr-2 h-4 w-4" /> Delete
				</Button>
			</div>
		</form>
	</div>
</DialogComp>
