<script lang="ts">
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { editRoleSchema } from './schema';

	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save, Trash } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';

	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import { columns, userColumns } from './columns.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import PermissionMatrix from '$lib/components/dashboard/permission-matrix.svelte';
	import { can, PERMISSIONS } from '$lib/permissions';
	import { untrack } from 'svelte';

	let singleTable = $derived([
		{ name: 'Name', value: data.singleUser?.name },

		{
			name: 'Description',
			value: data.singleUser?.description
		},
		{
			name: 'User Count',
			value: data?.singleUser?.userCount || 0
		},
		{ name: 'Permission Count', value: data?.singleUser?.permissionsCount || 0 }
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = untrack(() =>
		superForm(data.form, {
			validators: zod4Client(editRoleSchema),
			dataType: 'json',
			resetForm: false
		})
	);

	import { toast } from 'svelte-sonner';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

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
		superForm(data.permissionsForm, { id: 'role-permissions', dataType: 'json', resetForm: false })
	);

	$effect(() => {
		if (!$permMessage) return;
		if ($permMessage.type === 'error') toast.error($permMessage.text);
		else toast.success($permMessage.text);
	});

	const canEdit = $derived(can(data.access, 'roles.edit'));
	const canDelete = $derived(can(data.access, 'roles.delete'));

	let edit = $state(false);

	untrack(() => {
		$form.name = data.singleUser?.name;
		$form.description = data.singleUser?.description || '';
	});
</script>

<svelte:head>
	<title>Role Details</title>
</svelte:head>
<SingleView title="Role Details">
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
		{#if !canDelete || data.isSuperAdminRole}
			<!-- The Admin role can't be deleted; without the permission there's nothing to offer. -->
		{:else if data.singleUser?.userCount > 0}
			<Button
				variant="destructive"
				onclick={() => toast.error('Cannot delete role with users')}
				title="Cannot delete role with users"><Trash /> Delete</Button
			>
		{:else}
			<Delete redirect="/dashboard/admin-panel/roles" />
		{/if}
	</div>
	{#if edit === false}
		<div class="w-full p-4"><SingleTable {singleTable} /></div>
	{/if}
	{#if edit}
		<div class="w-full p-4">
			<form use:enhance action="?/edit" id="main" class="flex flex-col gap-4" method="POST">
				<Errors allErrors={$allErrors} />
				<InputComp
					label="Name"
					name="name"
					type="text"
					{form}
					{errors}
					placeholder="Enter Role Name"
				/>
				<InputComp
					label="Description"
					name="description"
					type="textarea"
					{form}
					{errors}
					placeholder="Enter Role Description"
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

<section class="mt-8 flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div>
			<h3 class="text-xl font-semibold">Permissions</h3>
			<p class="text-sm text-muted-foreground">
				{#if data.isSuperAdminRole}
					The Admin role has full access to everything, including pages added later.
				{:else}
					What users with this role can see and do in the dashboard.
				{/if}
			</p>
		</div>
		{#if canEdit && !data.isSuperAdminRole}
			<Button type="submit" form="role-permissions-form">
				{#if $permDelayed}
					<LoadingBtn name="Saving Permissions" />
				{:else}
					<Save class="h-4 w-4" /> Save Permissions
				{/if}
			</Button>
		{/if}
	</div>

	{#if data.isSuperAdminRole}
		<PermissionMatrix selected={PERMISSIONS.map((p) => p.key)} disabled idPrefix="role" />
	{:else}
		<form id="role-permissions-form" method="POST" action="?/editPermissions" use:permEnhance>
			<PermissionMatrix
				bind:selected={$permForm.permissions}
				locked={data.lockedPermissions}
				disabled={!canEdit}
				idPrefix="role"
			/>
		</form>
		{#if canEdit && data.lockedPermissions.length > 0}
			<p class="text-xs text-muted-foreground">
				Greyed-out permissions are ones you don’t hold yourself, so you can’t grant or remove them.
			</p>
		{/if}
	{/if}
</section>

<br />

{#if data?.userList?.length}
	<h3>Users on this Role</h3>
	<DataTable
		data={data?.userList}
		columns={userColumns}
		fileName="{data?.singleUser.name} Users List"
	/>
{/if}
