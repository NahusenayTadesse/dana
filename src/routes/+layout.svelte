<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import { getFlash } from 'sveltekit-flash-message';
	import { page } from '$app/state';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';

	const flash = getFlash(page, { clearAfterMs: 5000 });

	import { ModeWatcher } from 'mode-watcher';
	import { toast } from 'svelte-sonner';

	async function notifyBrowser(title: string, body: string) {
		if (!('Notification' in window)) return; // Safari iOS etc.

		if (Notification.permission === 'granted') {
			new Notification(title, { body, icon: '/logo.png' });
		} else if (Notification.permission !== 'denied') {
			const perm = await Notification.requestPermission();

			if (perm === 'granted') new Notification(title, { body, icon: '/logo.png' });
		}
	}

	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import Cart from '$lib/components/floating-cart/cart.svelte';
	import { setCart } from '$lib/hooks/cart.svelte'; // Adjust path
	import BottomMenu from '$lib/components/bottomMenu.svelte';
	import FloatingChat from '$lib/components/FloatingChat.svelte';

	// This initializes the class and puts it into Svelte's context
	let { data, children } = $props();

	setCart();

	$effect(() => {
		if (!$flash) return;
		if (page.data.flash?.type === 'success') toast.success($flash.message);
		if (page.data.flash?.type === 'error') toast.error($flash?.message);

		if (Notification.permission === 'granted') {
			notifyBrowser(
				page.data.flash?.type === 'success'
					? 'Success'
					: page.data.flash?.type === 'error'
						? 'Error'
						: 'Message',
				$flash.message
			);
		}

		$flash = undefined;
	});
</script>

<svelte:head><link rel="icon" href="/favicon.png" /></svelte:head>
<ModeWatcher />
<Toaster position="bottom-right" richColors closeButton />
<ProgressBar color="#28b6f6" zIndex={1000} />

{#if !page.url.pathname.startsWith('/dashboard')}
	<Header data={data?.user ?? ''} />
	{@render children()}
	<Footer />
	<!-- <Cart header={true} /> -->
	<BottomMenu />
	<FloatingChat />
{:else}
	{@render children()}
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
