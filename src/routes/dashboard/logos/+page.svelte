<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, Image as ImageIcon } from '@lucide/svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { superForm } from 'sveltekit-superforms';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import FormCard from '$lib/formComponents/FormCard.svelte';
	import { can } from '$lib/permissions';
	import { assetUrl } from '$lib/utils';

	let { data } = $props();

	// Uploading or removing logos needs content.edit; viewers just see them.
	const canEdit = $derived(can(data.access, 'content.edit'));

	let images: string[] = $derived(data?.gallery ?? []);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { id: 'partner-logos' })
	);

	// Server splits on ',' — join explicitly rather than relying on Array.toString.
	$effect(() => {
		$form.existing = images.join(',');
	});

	// Kept apart from the effect above: in one effect, removing a logo re-ran it
	// and toasted the previous message again.
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

<svelte:head>
	<title>Gallery</title>
</svelte:head>

<main class="container mx-auto w-full! space-y-8 p-4">
	<div class="border-b pb-4">
		<h1 class="text-3xl font-bold tracking-tight">Partner Company Logos</h1>
		<p class="text-muted-foreground">Manage Partner Company Logos</p>
	</div>

	<section class="space-y-4 lg:col-span-7">
		<div class="flex items-center gap-2 text-lg font-semibold">
			<ImageIcon class="h-5 w-5 text-primary" />
			<h2>Logo Images</h2>
		</div>

		<FormCard title="Logo Images: ({images.length})" className="w-full shadow-sm border">
			{#if canEdit}
				<form method="post" action="?/editGallery" use:enhance enctype="multipart/form-data">
					<InputComp label="" name="existing" type="hidden" {form} {errors} required={true} />

					<div class="rounded-lg border bg-muted/10 p-2">
						<InputComp
							{form}
							{errors}
							type="gallery"
							name="images"
							label=""
							placeholder="Drop images here or click to upload"
							bind:images
						/>
					</div>

					<div class="flex justify-end pt-2">
						<Button type="submit" class="w-full px-8 sm:w-auto" size="lg">
							{#if $delayed}
								<LoadingBtn name="Saving Changes..." />
							{:else}
								<Save class="mr-2 h-4 w-4" /> Save Gallery
							{/if}
						</Button>
					</div>
				</form>
			{:else}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{#each images as image, i (image + i)}
						<img
							src={assetUrl(image)}
							alt="Partner logo {i + 1}"
							loading="lazy"
							class="h-28 w-full rounded-lg border bg-muted/10 object-contain p-2"
						/>
					{:else}
						<p class="text-sm text-muted-foreground">No logos yet.</p>
					{/each}
				</div>
			{/if}
		</FormCard>
	</section>
</main>
