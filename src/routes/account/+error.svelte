<script>
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as m from '$lib/paraglide/messages.js';
</script>

<div class="flex h-full w-full flex-col items-center justify-center">
	<h1 class="text-5xl text-red-600">{page.status}</h1>

	<h3 class="font-head text-2xl text-red-600">{@html page.error?.message}</h3>

	<Button href="/account">{m.account_back_to_overview()}</Button>
</div>
