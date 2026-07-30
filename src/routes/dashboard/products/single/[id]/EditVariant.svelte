<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { SquarePen, Save, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import { untrack } from 'svelte';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';

	import type { editVariant } from './variant.schema';
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
		imageUrl: string | null;
	};

	let {
		data,
		variant,
		colorItems = [],
		widthItems = [],
		thicknessItems = [],
		lengthItems = [],
	}: {
		data: SuperValidated<Infer<typeof editVariant>>;
		variant: Variant;
		colorItems?: Item[];
		widthItems?: Item[];
		thicknessItems?: Item[];
		lengthItems?: Item[];
	} = $props();

	// A superForm id is fixed for the lifetime of the instance, so capturing the
	// initial row id here is deliberate.
	const formId = `variant-${untrack(() => variant.id)}`;

	const { form, errors, enhance, delayed, message } = superForm(data, {
		// Every row is handed the same `editVariantForm` from `load`, so without a
		// unique id all rows share one form id and each response is applied to all
		// of them — one row's save silently overwrites every other row's state.
		id: formId,
		dataType: 'json',
		// The prefill below is what makes this row's id/values exist at all; a reset
		// would wipe them back to the empty defaults and break the next submit.
		resetForm: false
	});

	// Prefill this row's values. With dataType: 'json' these go straight to the
	// server — no hidden inputs needed. Guarded on the row id so it re-applies if
	// this instance is ever reused for another row, but never clobbers an edit in
	// progress. `form.update` (not `$form`) keeps this off the keystroke path.
	let prefilledFor: number | null = null;
	$effect(() => {
		const v = variant;
		if (prefilledFor === v.id) return;
		prefilledFor = v.id;

		form.update(
			(f) => ({
				...f,
				id: v.id,
				colorId: v.colorId,
				widthId: v.widthId,
				thicknessId: v.thicknessId,
				lengthId: v.lengthId,
				sku: v.sku,
				price: v.price != null ? Number(v.price) : null,
				quantity: v.quantity,
				reorderLevel: v.reorderLevel
			}),
			{ taint: false }
		);
	});

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

			<InputComp
				{form}
				{errors}
				type="text"
				name="sku"
				label="SKU"
				placeholder="e.g. PPGI-RED-0.5-1000"
			/>

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
		

			<InputComp
				{form}
				{errors}
				type="file"
				name="image"
				image={variant.imageUrl ?? ''}
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
