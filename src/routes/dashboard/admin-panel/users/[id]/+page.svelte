<script lang="ts">
	import { untrack } from 'svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { editUserSchema } from './schema';

	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save } from '@lucide/svelte';
	import SelectComp from '$lib/formComponents/SelectComp.svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import PermissionMatrix from '$lib/components/dashboard/permission-matrix.svelte';
	import { can, PERMISSIONS } from '$lib/permissions';

	let singleTable = $derived([
		{ name: 'Name', value: data.singleUser?.name },
		{ name: 'Email', value: data.singleUser?.email },
		{ name: 'Role', value: data.singleUser?.role },
		{ name: 'Created At', value: data.singleUser?.createdAt.toLocaleString() },
		{ name: 'Updated At', value: data.singleUser?.updatedAt.toLocaleString() }
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = untrack(() =>
		superForm(data.form, {
			validators: zod4Client(editUserSchema),
			resetForm: false
		})
	);

	import { toast } from 'svelte-sonner';
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

	const {
		form: permForm,
		enhance: permEnhance,
		delayed: permDelayed,
		message: permMessage
	} = untrack(() =>
		superForm(data.permissionsForm, { id: 'user-permissions', dataType: 'json', resetForm: false })
	);

	$effect(() => {
		if (!$permMessage) return;
		if ($permMessage.type === 'error') toast.error($permMessage.text);
		else toast.success($permMessage.text);
	});

	const canEdit = $derived(can(data.access, 'users.edit'));
	const canDelete = $derived(can(data.access, 'users.delete'));

	//   let date = $derived(dateProxy(editForm, 'appointmentDate', { format: 'date'}));

	let edit = $state(false);

	untrack(() => {
		$form.name = data.singleUser?.name;
		$form.email = data.singleUser?.email;
		$form.role = data.singleUser?.roleId;
	});
</script>

<svelte:head>
	<title>User Details</title>
</svelte:head>
<SingleView title="User Details">
	<div class="mt-4 flex w-full flex-row items-start justify-start gap-2 pl-4">
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
			<Delete redirect="/dashboard/admin-panel/users" />
		{/if}
	</div>
	{#if edit === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if edit}
		<div class="w-full p-4">
			<form action="?/editUser" use:enhance class="flex flex-col gap-4" id="edit" method="post">
				<h3 class="text-center text-red-500">
					Any changes made here will signout the user from every device they are logged in on.
				</h3>
				<Errors allErrors={$allErrors} />

				{@render fe('Name', 'name', 'text', 'Change Name', true)}
				{@render fe('Email', 'email', 'email', 'Change email', true)}

				{@render selects('role', data?.roleList)}

				<Button form="edit" type="submit" class="mt-4">
					{#if $delayed}
						<LoadingBtn name="Saving Changes" />
					{:else}
						<Save class="h-4 w-4" />
						Save Changes
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</SingleView>

<section class="mt-8 flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h3 class="text-xl font-semibold">Permissions</h3>
			<p class="text-sm text-muted-foreground">
				{#if data.isSuperAdmin}
					On the Admin role — full access to everything.
				{:else}
					Ticked “(role)” permissions come from the {data.singleUser?.role ?? 'user’s'} role. Tick more
					to give this user extra access on top of their role.
				{/if}
			</p>
		</div>
		{#if canEdit && !data.isSuperAdmin}
			<Button type="submit" form="user-permissions-form">
				{#if $permDelayed}
					<LoadingBtn name="Saving Permissions" />
				{:else}
					<Save class="h-4 w-4" /> Save Permissions
				{/if}
			</Button>
		{/if}
	</div>

	{#if data.isSuperAdmin}
		<PermissionMatrix selected={PERMISSIONS.map((p) => p.key)} disabled idPrefix="user" />
	{:else}
		<form id="user-permissions-form" method="POST" action="?/editPermissions" use:permEnhance>
			<PermissionMatrix
				bind:selected={$permForm.permissions}
				inherited={data.rolePermissions}
				locked={data.lockedPermissions}
				disabled={!canEdit}
				idPrefix="user"
			/>
		</form>
	{/if}
</section>

{#snippet fe(
	label = '',
	name = '',
	type = '',
	placeholder = '',
	required = false,
	min = '',
	max = ''
)}
	<div class="flex w-full flex-col justify-start gap-2">
		<Label for={name}>{label}</Label>
		<Input
			{type}
			{name}
			{placeholder}
			{required}
			{min}
			{max}
			bind:value={$form[name]}
			aria-invalid={$errors[name] ? 'true' : undefined}
		/>
		{#if $errors[name]}
			<span class="text-red-500">{$errors[name]}</span>
		{/if}
	</div>
{/snippet}
{#snippet selects(name, items)}
	<div class="flex w-full flex-col justify-start gap-2">
		<Label for={name} class="capitalize">{name.replace(/([a-z])([A-Z])/g, '$1 $2')}:</Label>

		<SelectComp {name} bind:value={$form[name]} {items} />
		{#if $errors[name]}<span class="text-red-500">{$errors[name]}</span>{/if}
	</div>
{/snippet}
