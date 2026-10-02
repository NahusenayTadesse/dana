<script lang="ts">
	import Login from '$lib/forms/Login.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import AuthPhotoPanel from '$lib/components/AuthPhotoPanel.svelte';
	import * as m from '$lib/paraglide/messages.js';

	import type { ActionData, PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo title={m.login_meta_title()} description={m.login_meta_description()} />

<div
	class="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2"
>
	<AuthPhotoPanel />
	<Login data={data?.form} action="?/login" />
</div>

<!-- <form method="post" action="?/login" use:enhance>
	<label>
		Username
		<input
			name="username"
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<label>
		Password
		<input
			type="password"
			name="password"
			class="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		/>
	</label>
	<button class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
		>Login</button
	>
	<button
		formaction="?/register"
		class="rounded-md bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
		>Register</button
	>
</form>
<p style="color: red">{form?.message ?? ''}</p> -->
