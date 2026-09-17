<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	// import DialogComp from "$lib/formComponents/DialogComp.svelte";
	// import AddCustomer from "$lib/forms/AddCustomer.svelte";
	import { Plus, Sheet } from '@lucide/svelte';
	import { can } from '$lib/permissions';
	let { children } = $props();
	const canCreate = $derived(can(page.data.access, 'users.create'));
</script>

<div class="mb-8 flex flex-row items-center justify-start gap-2">
	<Button
		href="/dashboard/admin-panel/users"
		variant={page.url.pathname === '/dashboard/admin-panel/users' ? 'default' : 'outline'}
		><Sheet /> Users</Button
	>
	{#if canCreate}
		<Button
			href="/dashboard/admin-panel/users/add-users"
			variant={page.url.pathname === '/dashboard/admin-panel/users/add-users' ? 'default' : 'outline'}
			><Plus /> Add Users</Button
		>
	{/if}
	<!-- <DialogComp title="Add New Customer" {content} /> -->
</div>

<!-- {#snippet content()}

  <AddCustomer data={data?.form} action="/dashbaord/customers?/addCustomer" />

{/snippet} -->

{@render children?.()}
