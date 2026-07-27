<script lang="ts">
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { Edit, widthUnitEnum } from './schema';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';

	let {
		data,
		action = '?/edit',
		id,
		value,
		unit,
		label,
		isActive=true,

		icon = false,
	}: {
		data: SuperValidated<Infer<Edit>>;
		action: string;
		id: number;
			value: string | number,
		unit: typeof widthUnitEnum,
		label?: string,
		isActive: boolean,
		icon: boolean;
		
	} = $props();

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false
	});

	$form.id = id;
	$form.value = value;

	$form.unit = unit;
	$form.isActive = isActive,
	$form.label = label

	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
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

<!-- <Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class="{buttonVariants({ variant: 'ghost' })} justify-self-start p-0!">
			<Dialog.Root bind:open>
				<Dialog.Trigger class="flex w-auto flex-row items-center justify-center gap-2 border-0">
					{#if icon}
						<SquarePen /> Edit
					{:else}
						{name}
					{/if}
				</Dialog.Trigger>
				<Dialog.Content class="w-full bg-white">
					<Dialog.Header>
						<Dialog.Title class="text-center text-4xl">Edit {name}</Dialog.Title>
					</Dialog.Header> -->

<DialogComp title={icon ? 'Edit' : label} IconComp={icon ? SquarePen : undefined} variant="ghost">
	<form
		{action}
		use:enhance
		method="post"
		id="edit"
		class="flex w-full flex-col gap-4 p-4"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<InputComp 
  {form} 
  {errors} 
  label="Width Value" 
  type="number" 
  name="value" 

  required={true} 
/>

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
items={[
  { value: 'mm', name: 'Millimeter' },
  { value: 'cm', name: 'Centimeter' },
  { value: 'm', name: 'Meter' },
  { value: 'in', name: 'Inch' },
  { value: 'ft', name: 'Feet' },
]}			required={true}
			rows={10}
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
		<Button type="submit" class="mt-4" form="edit">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
<!-- </Dialog.Content>
			</Dialog.Root>
		</Tooltip.Trigger>
		<Tooltip.Content>
			<p>Edit {name}</p>
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider> -->
