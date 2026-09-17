<script lang="ts">
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DateField from '../promo-codes/date-field.svelte';
	import OptionalPicker from '../production/optional-picker.svelte';
	import { STATUS_ITEMS } from './types';

	let {
		form,
		errors,
		suppliers,
		people,
		statuses = STATUS_ITEMS
	}: {
		form: any;
		errors: any;
		suppliers: { value: number; name: string }[];
		people: { value: number; name: string }[];
		/** Only the statuses this order may move to (see `statusItemsFrom`). */
		statuses?: { value: string; name: string }[];
	} = $props();
</script>

<InputComp {form} {errors} label="Supplier" type="select" name="supplierId" items={suppliers} />
<InputComp {form} {errors} label="Status" type="select" name="status" items={statuses} />
<p class="px-1 text-xs text-muted-foreground">
	Status only moves forward. Marking an order received adds its lines to stock, and after that it can
	no longer change.
</p>
<DateField {form} {errors} label="Expected" name="expectedDate" hint="When it should arrive" />
<DateField {form} {errors} label="Received" name="receivedDate" hint="Fill in once it lands" />
<OptionalPicker {form} {errors} label="Raised by" name="raisedBy" items={people} />
<InputComp {form} {errors} label="Notes" type="textarea" name="notes" rows={3} />
