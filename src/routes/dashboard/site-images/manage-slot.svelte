<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { SquarePen, Save, RotateCcw, ExternalLink, Info } from '@lucide/svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { assetUrl } from '$lib/utils';
	import type { UpdateSlot, ResetSlot } from './schema';
	import type { SlotRow } from './types';

	let {
		slot,
		updateForm,
		resetForm,
		trigger = 'button'
	}: {
		slot: SlotRow;
		updateForm: SuperValidated<UpdateSlot>;
		resetForm: SuperValidated<ResetSlot>;
		/** 'button' renders the row action, 'label' turns the slot name into the trigger. */
		trigger?: 'button' | 'label';
	} = $props();

	let open = $state(false);

	/**
	 * Working copy of the images to keep. GalleryUpload edits this array in place
	 * when the admin removes one, and it is posted back as the `existing` field.
	 *
	 * `slot` and the two form objects are read once on purpose: each table row
	 * mounts its own instance, and superForm has to be created a single time.
	 */
	let keptImages = $state<string[]>(untrack(() => [...slot.values]));

	const {
		form,
		errors,
		enhance: updateEnhance,
		delayed: updateDelayed,
		message: updateMessage,
		allErrors
	} = untrack(() => superForm(updateForm, { resetForm: false, id: `update-${slot.key}` }));

	const {
		form: resetData,
		enhance: resetEnhance,
		delayed: resetDelayed,
		message: resetMessage
	} = untrack(() => superForm(resetForm, { resetForm: false, id: `reset-${slot.key}` }));

	// Keep the stores in step with the hidden inputs the actions actually read.
	untrack(() => {
		$form.slot = slot.key;
		$resetData.slot = slot.key;
	});

	// Follow the row when a save reloads the page data — but never yank images out
	// from under an admin who is mid-edit with the sheet open.
	$effect(() => {
		const current = slot.values;
		if (!open) untrack(() => (keptImages = [...current]));
	});

	// Server outcome -> toast, and close the sheet once something actually saved.
	$effect(() => {
		const msg = $updateMessage ?? $resetMessage;
		if (!msg) return;
		if (msg.type === 'error') {
			toast.error(msg.text);
		} else {
			toast.success(msg.text);
			untrack(() => (open = false));
		}
	});

	const atCapacity = $derived(slot.maxCount !== null && keptImages.length >= slot.maxCount);
</script>

<DialogComp
	bind:open
	title={trigger === 'label' ? slot.label : 'Edit'}
	IconComp={trigger === 'label' ? undefined : SquarePen}
	variant="ghost"
	size="lg"
>
	<div class="flex flex-col gap-5">
		<!-- What and where -->
		<div class="rounded-lg border bg-muted/40 p-4">
			<div class="flex flex-wrap items-center gap-2">
				<Badge variant="secondary">{slot.section}</Badge>
				<Badge variant="outline">{slot.kind === 'single' ? 'Single image' : 'Gallery'}</Badge>
				{#if slot.isCustom}
					<Badge>Customised</Badge>
				{:else}
					<Badge variant="outline">Using default</Badge>
				{/if}
				<a
					href={slot.page}
					target="_blank"
					rel="noopener noreferrer"
					class="ml-auto inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
				>
					View page <ExternalLink class="size-3" />
				</a>
			</div>

			<p class="mt-3 text-sm text-muted-foreground">{slot.description}</p>

			{#if slot.recommended}
				<p class="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
					<Info class="mt-0.5 size-3.5 shrink-0" />
					<span>Recommended: {slot.recommended}</span>
				</p>
			{/if}
		</div>

		<form
			method="post"
			action="?/updateSlot"
			use:updateEnhance
			enctype="multipart/form-data"
			id="update-{slot.key}"
			class="flex flex-col gap-4"
		>
			<Errors allErrors={$allErrors} />
			<input type="hidden" name="slot" value={slot.key} />
			<input type="hidden" name="existing" value={keptImages.join(',')} />

			{#if slot.kind === 'single'}
				<!-- Current image is shown separately from the dropzone, so the
				     dropzone stays available for the replacement. -->
				<div class="space-y-2">
					<p class="text-sm font-medium">Current image</p>
					<div class="overflow-hidden rounded-lg border bg-muted/30">
						{#if keptImages[0]}
							<img
								src={assetUrl(keptImages[0])}
								alt={slot.label}
								class="max-h-64 w-full object-contain"
							/>
						{:else}
							<p class="p-6 text-center text-sm text-muted-foreground">No image set.</p>
						{/if}
					</div>
				</div>

				<InputComp
					{form}
					{errors}
					type="file"
					name="image"
					label="Replace with"
					placeholder="PNG, JPG or WEBP"
				/>
			{:else}
				<div class="flex items-baseline justify-between">
					<p class="text-sm font-medium">
						Images ({keptImages.length}{slot.maxCount ? ` of ${slot.maxCount}` : ''})
					</p>
					{#if atCapacity}
						<p class="text-xs text-muted-foreground">Remove one before adding another.</p>
					{/if}
				</div>

				<InputComp
					{form}
					{errors}
					type="gallery"
					name="images"
					label=""
					placeholder="Drop images here or click to upload"
					bind:images={keptImages}
				/>
			{/if}

			<Button type="submit" form="update-{slot.key}" class="w-full">
				{#if $updateDelayed}
					<LoadingBtn name="Saving..." />
				{:else}
					<Save class="mr-2 size-4" /> Save changes
				{/if}
			</Button>
		</form>

		<!-- Sibling, not nested: reset is its own action. -->
		{#if slot.isCustom}
			<form
				method="post"
				action="?/resetSlot"
				use:resetEnhance
				id="reset-{slot.key}"
				class="border-t pt-4"
			>
				<input type="hidden" name="slot" value={slot.key} />
				<p class="mb-3 text-xs text-muted-foreground">
					Restores the {slot.kind === 'single' ? 'image' : 'images'} the site shipped with and deletes
					the uploads this slot was using.
				</p>
				<Button type="submit" variant="outline" class="w-full" form="reset-{slot.key}">
					{#if $resetDelayed}
						<LoadingBtn name="Restoring..." />
					{:else}
						<RotateCcw class="mr-2 size-4" /> Restore default
					{/if}
				</Button>
			</form>
		{/if}
	</div>
</DialogComp>
