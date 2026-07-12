<script lang="ts">
	import { page } from '$app/state';
	import { LayoutGrid, House, ShoppingCart, User, Search } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	const mobNav = [
		{ title: m.header_nav_home(), url: '/', icon: House },
		{ title: m.header_nav_shop(), url: '/shop', icon: LayoutGrid },
		{ title: m.header_nav_orders(), url: '/account/orders', icon: ShoppingCart },
		{ title: m.header_nav_account(), url: '/account', icon: User }
	];

	const on = 'text-primary shadow-lg shadow-primary/20 bg-primary/10';
	const off = 'text-muted-foreground hover:text-foreground hover:bg-muted/50';
	function blacken(url: string) {
		const currentPath = page.url.pathname;

		// Special case for root dashboard
		if (url === '/dashboard/') {
			return currentPath === '/' ? on : off;
		}

		// For other items, check if current path starts with their URL but is not just /dashboard
		return currentPath === url ? on : off;
	}

	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import Input from './ui/input/input.svelte';
	import { afterNavigate, goto } from '$app/navigation';
	let open = $state(false);
	let searchQuery = $state(page.url.searchParams.get('search') ?? '');
	function executionDesktopSearch(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			const shopUrl = new URL('/shop', window.location.origin);
			if (searchQuery.trim()) {
				shopUrl.searchParams.set('search', searchQuery.trim());
			}

			goto(shopUrl.toString());
		}
	}

	afterNavigate(() => {
		open = false;
	});
</script>

<nav
	class="fixed right-0 bottom-0 left-0 z-40 flex w-screen border-t border-border/50 bg-gradient-to-t from-background via-background/95 to-background/80 backdrop-blur-xl lg:hidden"
>
	<div class="grid w-full grid-cols-5 items-center justify-between px-2 py-3">
		{#each mobNav as item (item.url)}
			<a
				href={item.url}
				class="group relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-300 ease-out hover:scale-110 active:scale-95 {blacken(
					item.url
				)}"
				title={item.title}
			>
				<div
					class="relative flex h-6 w-6 items-center justify-center transition-all duration-300 {on
						? 'drop-shadow-lg'
						: ''}"
				>
					<item.icon class="h-4 w-4" />
				</div>

				<!-- Label -->
				<span
					class="text-xs leading-none font-medium whitespace-nowrap transition-all duration-300"
				>
					{item.title}
				</span>

				<!-- Hover glow effect -->
				{#if off}
					<div
						class="absolute inset-0 -z-10
					rounded-xl bg-linear-to-t from-primary/0 to-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
					></div>
				{/if}
			</a>
		{/each}

		<Dialog.Root bind:open>
			<Dialog.Trigger
				class="group relative flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-300 ease-out hover:scale-110 active:scale-95"
			>
				<div
					class="relative flex h-6 w-6 items-center justify-center transition-all duration-300 {on
						? 'drop-shadow-lg'
						: ''}"
				>
					<Search class="h-4 w-4" />
				</div>

				<!-- Label -->
				<span
					class="text-xs leading-none font-medium whitespace-nowrap transition-all duration-300"
				>
					{m.header_search()}
				</span></Dialog.Trigger
			>
			<Dialog.Content class="pt-8">
				<div class="relative mt-4 max-w-xs">
					<Search
						class="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/60"
					/>
					<Input
						type="search"
						placeholder={m.header_search_placeholder()}
						bind:value={searchQuery}
						onkeydown={executionDesktopSearch}
						class="h-8.5 rounded-lg border-border bg-muted/40 pl-9 text-xs shadow-inner focus-visible:border-primary focus-visible:ring-primary/20"
					/>
				</div>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</nav>
