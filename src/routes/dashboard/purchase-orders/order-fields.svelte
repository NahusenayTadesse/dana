<script lang="ts">
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DateField from '../promo-codes/date-field.svelte';
	import { STATUS_ITEMS } from './types';

	let {
		form,
		errors,
		suppliers,
		people
	}: {
		form: any;
		errors: any;
		suppliers: { value: number; name: string }[];
		people: { value: number; name: string }[];
	} = $props();
</script>

<InputComp {form} {errors} label="Supplier" type="select" name="supplierId" items={suppliers} />
<InputComp {form} {errors} label="Status" type="select" name="status" items={STATUS_ITEMS} />
<DateField {form} {errors} label="Expected" name="expectedDate" hint="When it should arrive" />
<DateField {form} {errors} label="Received" name="receivedDate" hint="Fill in once it lands" />
<InputComp {form} {errors} label="Raised by" type="select" name="raisedBy" items={people} />
<InputComp {form} {errors} label="Notes" type="textarea" name="notes" rows={3} />
