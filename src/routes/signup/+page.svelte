<script lang="ts">
	import Signup from '$lib/forms/Signup.svelte';
	import Seo from '$lib/components/Seo.svelte';
	import * as m from '$lib/paraglide/messages.js';

	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<Seo title={m.signup_meta_title()} description={m.signup_meta_description()} />

<div class="flex my-4 w-full items-center justify-center px-4">
	<Signup data={data?.form} action="?/signup" />
</div>
