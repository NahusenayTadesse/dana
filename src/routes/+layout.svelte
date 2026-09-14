<script lang="ts">
	import type { Pathname } from '$app/types';
	import { resolve } from '$app/paths';
	import { deLocalizeUrl, getLocale, locales, localizeHref } from '$lib/paraglide/runtime';
	import { siteOrigin } from '$lib/seo';
	import './layout.css';
	import { getFlash } from 'sveltekit-flash-message';
	import { page } from '$app/state';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';

	const flash = getFlash(page, { clearAfterMs: 5000 });

	import { ModeWatcher } from 'mode-watcher';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages.js';
	import { siteImage } from '$lib/siteImages.svelte';

	async function notifyBrowser(title: string, body: string) {
		if (!('Notification' in window)) return; // Safari iOS etc.

		if (Notification.permission === 'granted') {
			new Notification(title, { body, icon: siteImage('global.logo') });
		} else if (Notification.permission !== 'denied') {
			const perm = await Notification.requestPermission();

			if (perm === 'granted')
				new Notification(title, { body, icon: siteImage('global.logo') });
		}
	}

	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/files/Footer.svelte';
	import { setCart } from '$lib/hooks/cart.svelte'; // Adjust path
	import BottomMenu from '$lib/components/bottomMenu.svelte';
	import FloatingChat from '$lib/components/FloatingChat.svelte';
	import Cart from '$lib/components/floating-cart/cart.svelte';
	import Cursor from '$lib/cursor.svelte';

	// This initializes the class and puts it into Svelte's context
	let { data, children } = $props();

	setCart();

	// One canonical per page: no query string (shop filters, quote params) and
	// no /am prefix, since the language comes from a cookie, not the URL.
	const canonicalUrl = $derived(
		siteOrigin() + deLocalizeUrl(page.url).pathname.replace(/(.)\/$/, '$1')
	);

	$effect(() => {
		if (!$flash) return;
		if (page.data.flash?.type === 'success') toast.success($flash.message);
		if (page.data.flash?.type === 'error') toast.error($flash?.message);

		if (Notification.permission === 'granted') {
			notifyBrowser(
				page.data.flash?.type === 'success'
					? m.notify_success()
					: page.data.flash?.type === 'error'
						? m.notify_error()
						: m.notify_message(),
				$flash.message
			);
		}

		$flash = undefined;
	});
</script>

<svelte:head>
	<link rel="icon" href={siteImage('global.favicon')} />
	<link rel="apple-touch-icon" href="/logo192.png" />
	<meta name="theme-color" content="#1B3A8C" />
	{#if !page.error && !page.url.pathname.startsWith('/dashboard')}
		<link rel="canonical" href={canonicalUrl} />
		<meta property="og:url" content={canonicalUrl} />
	{/if}
	<meta property="og:site_name" content={m.brand_name()} />
	<meta property="og:locale" content={getLocale() === 'am' ? 'am_ET' : 'en_US'} />
</svelte:head>
<ModeWatcher />

<Toaster position="bottom-right" richColors closeButton />
<ProgressBar color="#28b6f6" zIndex={1000} />

{#if !page.url.pathname.startsWith('/dashboard')}
	<Header data={data?.user ?? ''} />
	{@render children()}
	<Footer />
	<Cart />
	<BottomMenu />
	<Cursor />
	<FloatingChat />
{:else}
	{@render children()}
{/if}

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as Pathname)}>{locale}</a>
	{/each}
</div>
