<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	// import DialogComp from "$lib/formComponents/DialogComp.svelte";
	// import AddCustomer from "$lib/forms/AddCustomer.svelte";
	import { Plus, Sheet } from '@lucide/svelte';
	let { children } = $props();
</script>

<div class="mb-8 flex flex-row items-center justify-start gap-2">
	<Button
		href="/dashboard/blog"
		variant={page.url.pathname === '/dashboard/blog' ? 'default' : 'outline'}
		><Sheet /> Blogs</Button
	>

	<Button
		href="/dashboard/blog/category"
		variant={page.url.pathname === '/dashboard/blog/category' ? 'default' : 'outline'}
		><Sheet /> Categories</Button
	>
	<Button
		href="/dashboard/blog/add-blog"
		variant={page.url.pathname === '/dashboard/blog/add-blog' ? 'default' : 'outline'}
		><Plus /> Add Blog</Button
	>
</div>

{@render children?.()}
