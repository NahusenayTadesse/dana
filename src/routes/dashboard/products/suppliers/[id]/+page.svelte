<script lang="ts">
	import { untrack } from 'svelte';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { edit as schema } from './schema';

	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import { can } from '$lib/permissions';

	const canEdit = $derived(can(data.access, 'suppliers.edit'));
	const canDelete = $derived(can(data.access, 'suppliers.delete'));

	let singleTable = $derived([
		{ name: 'Name', value: data.single?.name ?? '' },
		{ name: 'Phone', value: data.single?.phone ?? '' },
		{ name: 'Email', value: data.single?.email ?? '' },
		{ name: 'Description', value: data.single?.description ?? '' },
		{ name: 'Status', value: data.single?.status ? 'Active' : 'Inactive' },
		{ name: 'Linked products', value: String(data.usage.products) },
		{ name: 'Purchase orders', value: String(data.usage.purchaseOrders) },
		{ name: 'Raw materials', value: String(data.usage.rawMaterials) }
	]);

	// The form is pre-filled on the server from the stored supplier.
	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = untrack(() =>
		superForm(data.editForm, {
			validators: zod4Client(schema),
			resetForm: false
		})
	);

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	export const snapshot: Snapshot = { capture, restore };

	let edit = $state(false);
</script>

<svelte:head>
	<title>Supplier Details</title>
</svelte:head>
<SingleView title="Supplier Details">
	<div class="mt-4 flex w-full flex-row flex-wrap items-center justify-start gap-2 pl-4">
		{#if canEdit}
			<Button onclick={() => (edit = !edit)}>
				{#if !edit}
					<Pencil class="h-4 w-4" />
					Edit
				{:else}
					<ArrowLeft class="h-4 w-4" />

					Back
				{/if}
			</Button>
		{/if}
		{#if canDelete}
			<Delete redirect="/dashboard/products/suppliers" />
			{#if data.usage.total > 0}
				<p class="text-sm text-muted-foreground">
					This supplier is in use, so deleting it will deactivate it instead.
				</p>
			{/if}
		{/if}
	</div>
	{#if !canEdit || edit === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if canEdit && edit}
		<div class="w-full p-4">
			<form use:enhance action="?/edit" id="main" class="flex flex-col gap-4" method="POST">
				<Errors allErrors={$allErrors} />

				<InputComp {form} {errors} label="name" type="text" name="name" required={true} />
				<InputComp {form} {errors} label="phone" type="tel" name="phone" required={true} />
				<InputComp {form} {errors} label="email" type="email" name="email" required={false} />
				<InputComp
					{form}
					{errors}
					label="description"
					type="textarea"
					name="description"
					required={false}
				/>

				<InputComp
					label="Status"
					name="status"
					type="select"
					{form}
					{errors}
					items={[
						{ value: true, name: 'Active' },
						{ value: false, name: 'Inactive' }
					]}
				/>

				<Button type="submit" class="mt-4" form="main">
					{#if $delayed}
						<LoadingBtn name="Saving Change" />
					{:else}
						<Save class="h-4 w-4" />

						Save Changes
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</SingleView>
