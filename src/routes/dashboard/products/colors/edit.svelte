<script lang="ts">
	import { untrack } from 'svelte';
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
		name,
		code,
		hexValue,
		image
	}: {
		data: SuperValidated<Edit>;
		action?: string;
		id: number;
		name: string;
		code?: string | null;
		hexValue?: string | null;
		image?: string | null;
	} = $props();

	let open = $state(false);

	// One instance per row, each with its own id — a shared id sends every
	// action result to the first row's form.
	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, id: `color-${id}` })
	);

	untrack(() => {
		$form.id = id;
		$form.name = name;
		$form.hexValue = hexValue ?? '';
		$form.code = code ?? '';
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
		id="color-edit-{id}"
		class="flex w-full flex-col gap-4 p-4"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<InputComp {form} {errors} label="name" type="text" name="name" required={true} />

		<InputComp {form} {errors} label="Code" type="text" name="code" placeholder="Enter Code" />
		<InputComp
			label="Hex Value"
			name="hexValue"
			type="text"
			placeholder="#C1121F"
			required={true}
			{form}
			{errors}
		/>
		<InputComp
			label="Swatch Image"
			name="image"
			type="file"
			placeholder="JPEG, PNG, WEBP, AVIF or GIF (Max 10MB)"
			image={image ?? ''}
			{form}
			{errors}
		/>

		<Button type="submit" class="mt-4" form="color-edit-{id}">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
