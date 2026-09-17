<script lang="ts">
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import OptionalPicker from '../../production/optional-picker.svelte';

	let {
		form,
		errors,
		materials,
		variants
	}: {
		form: any;
		errors: any;
		materials: { value: number; name: string }[];
		variants: { value: number; name: string }[];
	} = $props();
</script>

<OptionalPicker {form} {errors} label="Raw material" name="rawMaterialId" items={materials} />
<OptionalPicker
	{form}
	{errors}
	label="…or finished product"
	type="combo"
	name="variantId"
	items={variants}
/>
<p class="px-1 text-xs text-muted-foreground">
	A line buys one or the other — set the other to None. Finished products are counted in whole
	pieces.
</p>
<InputComp {form} {errors} label="Quantity" type="number" name="quantity" min="0" required={true} />
<InputComp
	{form}
	{errors}
	label="Unit cost (ETB)"
	type="number"
	name="unitCost"
	min="0"
	placeholder="Leave blank until the price is agreed"
/>
