<script>
	import { page } from '$app/state';
	import Button from '$lib/components/ui/button/button.svelte';
	import { Plus, Sheet } from '@lucide/svelte';
	let { children } = $props();

	const tabs = [
		{ href: '/dashboard/products', label: 'Products', icon: Sheet },
		{ href: '/dashboard/products/add-products', label: 'Add Products', icon: Plus },
		{ href: '/dashboard/products/colors', label: 'Colors', icon: Sheet },
		{ href: '/dashboard/products/widths', label: 'Widths', icon: Sheet },
		{ href: '/dashboard/products/thickness', label: 'Thickness', icon: Sheet },
		{ href: '/dashboard/products/lengths', label: 'Lengths', icon: Sheet },
		{ href: '/dashboard/products/categories', label: 'Categories', icon: Sheet },
		{ href: '/dashboard/products/tags', label: 'Tags', icon: Sheet },
		{ href: '/dashboard/products/suppliers', label: 'Suppliers', icon: Sheet },
		{ href: '/dashboard/products/suppliers/add-suppliers', label: 'Add Suppliers', icon: Plus }
	];

	// Only tabs for pages the user's permissions let them open.
	const visibleTabs = $derived.by(() => {
		const allowed = new Set(page.data.allowedRoutes ?? []);
		return tabs.filter((tab) => allowed.has(tab.href));
	});
</script>

<div class="mb-8 flex flex-row flex-wrap items-center justify-start gap-2">
	{#each visibleTabs as tab (tab.href)}
		<Button href={tab.href} variant={page.url.pathname === tab.href ? 'default' : 'outline'}>
			<tab.icon />
			{tab.label}
		</Button>
	{/each}
</div>

{@render children?.()}
