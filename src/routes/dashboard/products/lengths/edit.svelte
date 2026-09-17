<script lang="ts">
	import { untrack } from 'svelte';
	import { LENGTH_UNITS, unitOptions, type LengthUnit } from '$lib/units';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Edit } from './schema';

	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

	let {
		data,
		action = '?/edit',
		id,
		value,
		unit,
		label,
		isActive = true
	}: {
		data: SuperValidated<Edit>;
		action?: string;
		id: number;
		value: string | number;
		unit: LengthUnit;
		label?: string | null;
		isActive?: boolean | null;
	} = $props();

	let open = $state(false);

	// One instance per row, each with its own id — a shared id sends every
	// action result to the first row's form.
	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, id: `length-${id}` })
	);

	untrack(() => {
		$form.id = id;
		$form.value = String(value);
		$form.unit = unit;
		$form.isActive = isActive ?? true;
		$form.label = label ?? '';
	});

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') {
			toast.error($message.text);
		} else {
			toast.success($message.text);
			open = false;
		}
	});
</script>

<DialogComp bind:open title="Edit" IconComp={SquarePen} variant="ghost">
	<form
		{action}
		use:enhance
		method="post"
		id="length-edit-{id}"
		class="flex w-full flex-col gap-4 p-4"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<InputComp {form} {errors} label="Length Value" type="number" name="value" required={true} />

		<InputComp
			{form}
			{errors}
			label="Display Label"
			type="text"
			name="label"
			placeholder="e.g. Standard 1000mm"
		/>
		<InputComp
			{form}
			{errors}
			label="Unit"
			type="select"
			name="unit"
			items={unitOptions(LENGTH_UNITS)}
			required={true}
		/>

		<InputComp
			label="Status"
			name="isActive"
			type="select"
			{form}
			{errors}
			items={[
				{ value: true, name: 'Active' },
				{ value: false, name: 'Inactive' }
			]}
		/>
		<Button type="submit" class="mt-4" form="length-edit-{id}">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
