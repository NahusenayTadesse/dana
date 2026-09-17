<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save } from '@lucide/svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { EditGallery } from './schema';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';

	let {
		data,
		images = $bindable()
	}: {
		data: SuperValidated<EditGallery>;
		images: string[];
	} = $props();

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data, { id: 'blog-gallery' })
	);

	// Server splits on ',' — join explicitly rather than relying on Array.toString.
	$effect(() => {
		$form.existing = images.join(',');
	});

	// Kept apart from the effect above: in one effect, removing an image re-ran
	// it and toasted the previous message again.
	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') {
			toast.error($message.text);
		} else {
			toast.success($message.text);
		}
	});
</script>

<div class="flex flex-col items-center justify-center gap-4 pt-4">
	<form
		method="post"
		action="?/editGallery"
		use:enhance
		class="flex w-full flex-col gap-3"
		enctype="multipart/form-data"
	>
		<InputComp label="" name="existing" type="hidden" {form} {errors} required={true} />
		<InputComp
			{form}
			{errors}
			type="gallery"
			name="gallery"
			label="Blog Gallery"
			placeholder="Edit and upload new gallery images"
			bind:images
		/>
		<Button type="submit" size="lg">
			{#if $delayed}
				<LoadingBtn name="Saving New Gallery" />
			{:else}
				<Save /> Save Changes
			{/if}
		</Button>
	</form>
</div>
