<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';

	import { Plus, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { add as schema } from './schema';
	import { superForm } from 'sveltekit-superforms/client';
	import Errors from '$lib/formComponents/Errors.svelte';
	import FormCard from '$lib/formComponents/FormCard.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let { data } = $props();

	const { form, errors, enhance, delayed, allErrors, capture, restore, message } = superForm(
		data.form,
		{
			taintedMessage: () => {
				return new Promise((resolve) => {
					resolve(window.confirm('Do you want to leave?\nChanges you made may not be saved.'));
				});
			},
			onChange(event) {
				if (event.paths.includes('title')) {
					$form.slug = $form.title?.toLowerCase().replace(/\s+/g, '-');
				}
			},

			validators: zod4Client(schema)
		}
	);

	export const snapshot: Snapshot = { capture, restore };

	import { toast } from 'svelte-sonner';
	import RichTextEditor from '$lib/formComponents/RichTextEditor.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let images = $state([]);
</script>

<svelte:head>
	<title>Add New Blog</title>
</svelte:head>
<FormCard title="Add A Blog" description="Add New Blog">
	<form
		use:enhance
		action="?/addBlog"
		id="main"
		class="flex flex-col gap-4"
		method="POST"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />

		<InputComp
			{form}
			{errors}
			type="text"
			name="title"
			label="Blog Title"
			placeholder="Enter Title "
			required
		/>

		<InputComp
			{form}
			{errors}
			type="text"
			name="slug"
			label="Blog Slug"
			placeholder="Enter Blog Slug"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="select"
			name="category"
			label="Category"
			placeholder="Select Category"
			items={data?.cats}
			required
		/>
		<InputComp
			{form}
			{errors}
			label="Excerpt | Short Description"
			type="textarea"
			name="excerpt"
			placeholder="Enter Excerpt of Blog"
			required={true}
			rows={10}
		/>

		<InputComp
			{form}
			{errors}
			label="Content"
			type="hidden"
			name="content"
			placeholder="Enter Content"
			required={true}
			rows={10}
		/>
		<RichTextEditor bind:value={$form.content} />
		<InputComp
			{form}
			{errors}
			type="file"
			name="image"
			label="Blog Featured Image"
			placeholder="Upload Blog Featured Image"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="gallery"
			name="gallery"
			label="Blog Gallery Images"
			placeholder="Upload Blog Gallery Images"
			required
			bind:images
		/>

		<Button type="submit" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Blog" />
			{:else}
				<Plus /> Add Blog
			{/if}
		</Button>
	</form>
</FormCard>
