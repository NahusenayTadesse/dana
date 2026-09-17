<script lang="ts">
	import { untrack } from 'svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { SquarePen, Save } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { EditPaymentMethod as schema } from './schema';

	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Messages from '$lib/formComponents/Messages.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

	let {
		data,
		action = '?/edit',
		id,
		name,
		isActive,
		icon = false
	}: {
		data: SuperValidated<schema>;
		action?: string;
		id: number;
		name: string;
		isActive: boolean;
		icon?: boolean;
	} = $props();

	// One form id per row: rows sharing an id get each other's action results,
	// so saving one row could fill (and later overwrite) another.
	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, {
			id: `payment-method-${id}`,
			resetForm: false
		})
	);

	let open = $state(false);

	untrack(() => {
		$form.id = id;
		$form.name = name;
		$form.isActive = isActive;
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
				open = false;
			}
		}
	});
</script>

<DialogComp
	title={icon ? 'Edit' : name}
	variant="ghost"
	IconComp={icon ? SquarePen : undefined}
	bind:open
>
	<form {action} use:enhance method="post" class="flex w-full flex-col gap-4 p-4">
		<Errors allErrors={$allErrors} />
		<input type="hidden" name="id" value={$form.id} />
		<Messages {message} />
		<InputComp
			label="Name"
			name="name"
			type="text"
			{form}
			{errors}
			placeholder="Enter Name of Payment Method"
		/>
		<InputComp
			label="Status"
			name="isActive"
			type="checkboxSingle"
			{form}
			{errors}
			placeholder="Active — offered when recording new payments"
		/>

		<!-- Inside its form: a `form="edit"` attribute pointed every row's button
		     at the first form with that id in the page. -->
		<Button type="submit" class="mt-4">
			{#if $delayed}
				<LoadingBtn name="Saving Changes" />
			{:else}
				<Save class="h-4 w-4" />

				Save Changes
			{/if}
		</Button>
	</form>
</DialogComp>
