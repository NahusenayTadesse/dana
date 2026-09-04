<script lang="ts">
	import InputComp from '$lib/formComponents/InputComp.svelte';

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

<InputComp {form} {errors} label="Raw material" type="select" name="rawMaterialId" items={materials} />
<InputComp {form} {errors} label="…or finished product" type="combo" name="variantId" items={variants} />
<p class="px-1 text-xs text-muted-foreground">
	A line buys one or the other. Picking both is refused, because there would be nothing to receive
	the quantity against.
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
