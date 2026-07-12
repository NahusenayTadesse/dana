<script lang="ts">
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { editUserSchema } from './schema';

	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';

	const getOrderCount = (status: string) =>
		data?.orderCounts?.find((item) => item.status === status)?.count ?? 0;

	let singleTable = $derived([
		{ name: m.account_details_name(), value: data.singleUser?.name },
		{ name: m.account_details_email(), value: data.singleUser?.email },
		{ name: m.account_details_phone(), value: data.singleUser?.phone },
		{
			name: m.account_details_lifetime_orders(),
			value: m.account_details_orders_count({ count: data.singleUser?.numberOfOrders ?? 0 })
		},
		{
			name: m.account_details_pending_orders(),
			value: m.account_details_orders_count({ count: getOrderCount('pending') })
		},
		{
			name: m.account_details_delivered_orders(),
			value: m.account_details_orders_count({ count: getOrderCount('delivered') })
		},
		{
			name: m.account_details_cancelled_orders(),
			value: m.account_details_orders_count({ count: getOrderCount('cancelled') })
		},
		{
			name: m.account_details_joined(),
			value:
				data.singleUser?.createdAt?.toLocaleString('en-ca', {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				}) ?? ''
		}
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			validators: zod4Client(editUserSchema),
			resetForm: false
		}
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

	$form.name = data.singleUser?.name;
	$form.phone = data.singleUser?.phone;
	$form.email = data.singleUser?.email;
</script>

<svelte:head>
	<title>{m.account_details_meta_title()}</title>
</svelte:head>

<SingleView title={m.account_details_title()} class="my-8 justify-self-center">
	<div class="mt-4 flex w-full flex-row items-start justify-start gap-2 pl-4">
		<Button onclick={() => (edit = !edit)}>
			{#if !edit}
				<Pencil class="h-4 w-4" />
				{m.account_details_edit_account()}
			{:else}
				<ArrowLeft class="h-4 w-4" />
				{m.account_details_back()}
			{/if}
		</Button>
	</div>

	{#if edit === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}

	{#if edit}
		<div class="w-full p-4">
			<form action="?/editUser" use:enhance class="flex flex-col gap-4" id="edit" method="post">
				<Errors allErrors={$allErrors} />
				<InputComp
					label={m.account_details_your_name_label()}
					{form}
					{errors}
					type="text"
					name="name"
					placeholder={m.account_details_name_placeholder()}
					required
				/>
				<InputComp
					label={m.account_details_phone_label()}
					{form}
					{errors}
					type="tel"
					name="phone"
					placeholder={m.account_details_phone_placeholder()}
				/>
				<InputComp
					label={m.account_details_email_label()}
					{form}
					type="email"
					{errors}
					name="email"
					placeholder={m.account_details_email_placeholder()}
					required
				/>

				<Button form="edit" type="submit" class="mt-4">
					{#if $delayed}
						<LoadingBtn name={m.account_details_saving_changes()} />
					{:else}
						<Save class="h-4 w-4" />
						{m.account_details_save_changes()}
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</SingleView>
