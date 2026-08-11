<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import Logout from '$lib/forms/Logout.svelte';
	// import DialogComp from "$lib/formComponents/DialogComp.svelte";
	// import AddCustomer from "$lib/forms/AddCustomer.svelte";
	import { SquarePen, User } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	let { children } = $props();
</script>

<div class="mb-8 flex flex-row flex-wrap items-center justify-start gap-2">
	<Button
		href="/account/settings"
		variant={page.url.pathname === '/account/settings' ? 'default' : 'outline'}
		><User /> {m.account_settings_profile_details()}</Button
	>

	<Button
		href="/account/settings/change-password"
		variant={page.url.pathname === '/account/settings/change-password' ? 'default' : 'outline'}
		><SquarePen /> {m.change_password_title()}</Button
	>

	<Logout />
</div>

{@render children?.()}
