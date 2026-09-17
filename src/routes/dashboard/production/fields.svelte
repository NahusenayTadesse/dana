<script lang="ts">
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DateField from '../promo-codes/date-field.svelte';
	import OptionalPicker from './optional-picker.svelte';

	// The add sheet and the edit sheet ask for exactly the same nine things, so
	// they share this rather than keeping two copies in step by hand.
	let {
		form,
		errors,
		variants,
		materials,
		people,
		warehouses
	}: {
		form: any;
		errors: any;
		variants: { value: number; name: string }[];
		materials: { value: number; name: string }[];
		people: { value: number; name: string }[];
		warehouses: { value: number; name: string }[];
	} = $props();
</script>

<InputComp
	{form}
	{errors}
	label="Batch number"
	type="text"
	name="batchNumber"
	placeholder="B-2026-014"
	required={true}
/>
<InputComp {form} {errors} label="Product made" type="combo" name="variantId" items={variants} />
<DateField {form} {errors} label="Production date" name="productionDate" />

<InputComp
	{form}
	{errors}
	label="Pieces produced"
	type="number"
	name="quantityProduced"
	min="0"
	required={true}
/>
<OptionalPicker {form} {errors} label="Raw material used" name="rawMaterialId" items={materials} />
<InputComp
	{form}
	{errors}
	label="Material consumed"
	type="number"
	name="rawMaterialConsumed"
	min="0"
	placeholder="In the material's own unit — taken off its on-hand"
/>
<InputComp
	{form}
	{errors}
	label="Scrap"
	type="number"
	name="scrapQuantity"
	min="0"
	placeholder="Offcuts and waste, same unit as consumed"
/>
<OptionalPicker {form} {errors} label="Produced by" name="producedBy" items={people} />
<OptionalPicker {form} {errors} label="Stock landed in" name="warehouseId" items={warehouses} />
<p class="px-1 text-xs text-muted-foreground">
	The pieces are added to this warehouse's stock — the default warehouse when left empty.
</p>
