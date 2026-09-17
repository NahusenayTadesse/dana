<script lang="ts">
	import { untrack } from 'svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { EditTestimonial } from './schema';

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
		position,
		testimonial,
		avatar,
		isApproved = false
	}: {
		data: SuperValidated<EditTestimonial>;
		action?: string;
		id: number;
		name: string;
		position?: string | null;
		avatar?: string | null;
		testimonial?: string | null;
		isApproved?: boolean | null;
	} = $props();

	let open = $state(false);

	// One instance per row, each with its own id — a shared id sends every
	// action result to the first row's form.
	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, id: `testimonial-${id}` })
	);

	untrack(() => {
		$form.id = id;
		$form.name = name;
		$form.position = position ?? '';
		$form.testimonial = testimonial ?? '';
		$form.isApproved = !!isApproved;
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

<DialogComp bind:open title="Edit" variant="ghost" IconComp={SquarePen}>
	<form
		{action}
		use:enhance
		method="post"
		id="testimonial-edit-{id}"
		class="flex w-full flex-col gap-4 p-4"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<InputComp {form} {errors} label="Name of Customer" type="text" name="name" required={true} />
		<InputComp {form} {errors} label="Position" type="text" name="position" />
		<InputComp {form} {errors} label="Testimonial" type="textarea" name="testimonial" />
		<InputComp
			{form}
			{errors}
			label="Logo or Avatar"
			image={avatar ?? ''}
			type="file"
			name="avatar"
			placeholder="JPEG, PNG, WEBP, AVIF or GIF (Max 10MB)"
		/>
		<InputComp
			{form}
			{errors}
			label="Approved"
			type="checkboxSingle"
			name="isApproved"
			placeholder="Show on website"
		/>

		<Button type="submit" class="mt-4" form="testimonial-edit-{id}">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
