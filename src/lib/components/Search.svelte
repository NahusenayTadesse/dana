<script>
	import { page } from '$app/state';
	import * as Command from '$lib/components/ui/command/index.js';
	import { Disc, Search } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	let isOpen = $state(false);
	let list = [
		{ label: 'Dashboard', path: '/dashboard' },

		// Admin Panel

		// Customers
		{ label: 'Customers', path: '/dashboard/customers' },

		// Orders — one route, filtered by `?status=` (there are no per-status pages)
		{ label: 'All Orders', path: '/dashboard/orders' },
		{ label: 'Pending Orders', path: '/dashboard/orders?status=pending' },
		{ label: 'Cancelled Orders', path: '/dashboard/orders?status=cancelled' },
		{ label: 'Delivered Orders', path: '/dashboard/orders?status=delivered' },
		{ label: 'Quotes', path: '/dashboard/quotes' },
		{ label: 'Messages', path: '/dashboard/messages' },
		{ label: 'Promo Codes', path: '/dashboard/promo-codes' },
		{ label: 'Payment Links', path: '/dashboard/payment-links' },

		// Products
		{ label: 'Products', path: '/dashboard/products' },
		{ label: 'Add Products', path: '/dashboard/products/add-products' },
		{ label: 'Product Categories', path: '/dashboard/products/categories' },
		{ label: 'Suppliers', path: '/dashboard/products/suppliers' },
		{ label: 'Add Supplier', path: '/dashboard/products/suppliers/add-suppliers' },

		// Stock & production
		{ label: 'Stock by Warehouse', path: '/dashboard/stock' },
		{ label: 'Warehouses', path: '/dashboard/warehouses' },
		{ label: 'Production Batches', path: '/dashboard/production' },
		{ label: 'Raw Materials', path: '/dashboard/raw-materials' },
		{ label: 'Purchase Orders', path: '/dashboard/purchase-orders' },
		{ label: 'Staff', path: '/dashboard/staff' },

		{ label: 'Reports', path: '/dashboard/reports' },
		{ label: 'Business Settings', path: '/dashboard/business-settings' },
		{ label: 'Company Details', path: '/dashboard/company-details' },
		{ label: 'Help', path: '/dashboard/help' },

		{ label: 'Payment Methods', path: '/dashboard/admin-panel/payment-methods' },
		{ label: 'Roles', path: '/dashboard/admin-panel/roles' },
		{ label: 'Add Roles', path: '/dashboard/admin-panel/roles/add-roles' },
		{ label: 'Users', path: '/dashboard/admin-panel/users' },
		{ label: 'Add Users', path: '/dashboard/admin-panel/users/add-users' }
	];

	// Only pages the user's permissions let them open.
	const visible = $derived.by(() => {
		const allowed = new Set(page.data.allowedRoutes ?? []);
		return list.filter((item) => allowed.has(item.path.split('?')[0]));
	});
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger class="w-auto px-4" title="Search for Pages"><Search /></Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Search the whole site</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto rounded-md border p-2">
			<h5 class="text-center">Search Anything</h5>
			<Command.Root class="rounded-lg shadow-md md:min-w-[450px]">
				<Command.Input placeholder="Type a command or search..." type="search" />
				<Command.List>
					<Command.Empty>No results found.</Command.Empty>
					<Command.Group heading="Suggestions">
						{#each visible as item (item.path)}
							<Command.Item>
								<Disc />
								<a href={item.path} onclick={() => (isOpen = false)}>{item.label}</a>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
