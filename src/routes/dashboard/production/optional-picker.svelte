<script lang="ts">
	import { Label } from '$lib/components/ui/label/index.js';
	import { CircleAlert } from '@lucide/svelte';
	import SelectComp from '$lib/formComponents/SelectComp.svelte';
	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';

	// InputComp's select/combo with a "None" option, for pickers that are allowed
	// to be empty (supplier, material, producer, warehouse). InputComp doesn't
	// forward `clearable`, so without this a picked value could never be unset.
	// Shared by the production, raw-material and purchase-order screens.
	let {
		label,
		name,
		form,
		errors,
		items,
		type = 'select'
	}: {
		label: string;
		name: string;
		form: any;
		errors: any;
		items: { value: number | string; name: string }[];
		type?: 'select' | 'combo';
	} = $props();
</script>

<div class="flex w-full max-w-full flex-col justify-start gap-2 p-1">
	<Label for={name} class="capitalize">{label}</Label>
	{#if type === 'combo'}
		<ComboboxComp {name} bind:value={$form[name]} {items} clearable />
	{:else}
		<SelectComp {name} bind:value={$form[name]} {items} clearable />
	{/if}
	{#if $errors[name]}
		{#each [$errors[name]].flat() as error (error)}
			<p class="flex items-center gap-2 text-red-500"><CircleAlert /> {error}</p>
		{/each}
	{/if}
</div>
