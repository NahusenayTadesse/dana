<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save } from '@lucide/svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { EditGallery } from './schema';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let {
		data,
		images = $bindable()
	}: {
		data: SuperValidated<EditGallery>;
		images: string[];
	} = $props();
	const { form, errors, enhance, delayed, message } = superForm(data, {});
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';
	$effect(() => {
		$form.existing = images.join(','); // server splits on ',' — join explicitly rather than relying on Array.toString
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
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
			label={m.edit_gallery_label()}
			placeholder={m.edit_gallery_placeholder()}
			required
			bind:images
		/>
		<Button type="submit" variant="destructive" size="lg">
			{#if $delayed}
				<LoadingBtn name={m.edit_gallery_saving()} />
			{:else}
				<Save />
				{m.edit_gallery_save()}
			{/if}
		</Button>
	</form>
</div>
