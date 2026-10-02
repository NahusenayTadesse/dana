<script lang="ts">
	import Signup from '$lib/forms/Signup.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import AuthPhotoPanel from '$lib/components/AuthPhotoPanel.svelte';
	import * as m from '$lib/paraglide/messages.js';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo title={m.signup_meta_title()} description={m.signup_meta_description()} />

<div class="mx-auto my-4 grid w-full max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
	<AuthPhotoPanel />
	<Signup data={data?.form} action="?/signup" />
</div>
