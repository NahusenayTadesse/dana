<script lang="ts">
	import { Input } from '$lib/components/ui/input/index';
	import { Label } from '$lib/components/ui/label/index.js';
	import { CircleAlert } from '@lucide/svelte';

	// InputComp's `type="date"` renders the Ethiopian-calendar picker, which
	// always resolves to a day — there is no way to say "no end date". A promo
	// code needs that, so this is the plain browser date input plus InputComp's
	// label and error treatment.
	let {
		label,
		name,
		form,
		errors,
		hint = ''
	}: {
		label: string;
		name: string;
		form: any;
		errors: any;
		hint?: string;
	} = $props();
</script>

<div class="flex w-full max-w-full flex-col justify-start gap-2 p-1">
	<Label for={name} class="capitalize">{label}</Label>
	<Input type="date" id={name} {name} bind:value={$form[name]} />
	{#if hint}
		<p class="text-xs text-muted-foreground">{hint}</p>
	{/if}
	{#if $errors[name]}
		<p class="flex items-center gap-2 text-red-500"><CircleAlert /> {$errors[name]}</p>
	{/if}
</div>
