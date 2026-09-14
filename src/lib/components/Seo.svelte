<script lang="ts">
	import { absoluteUrl, jsonLdScript, metaDescription, siteOrigin } from '$lib/seo';
	import { siteImage } from '$lib/siteImages.svelte';

	/**
	 * Per-page search/social metadata. The root layout already emits the
	 * canonical link, og:url, og:site_name and og:locale, so a page only
	 * describes itself here — and never repeats those tags.
	 */
	let {
		title,
		description,
		image = '',
		type = 'website',
		noindex = false,
		jsonLd
	}: {
		title: string;
		description?: string;
		/** Site path or stored asset URL; defaults to the first hero photo. */
		image?: string;
		type?: 'website' | 'article' | 'product';
		noindex?: boolean;
		jsonLd?: unknown;
	} = $props();

	const origin = siteOrigin();
	const summary = $derived(metaDescription(description));
	const imageUrl = $derived(absoluteUrl(image || siteImage('home.hero.slides'), origin));
</script>

<svelte:head>
	<title>{title}</title>
	{#if summary}
		<meta name="description" content={summary} />
	{/if}
	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{/if}

	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	{#if summary}
		<meta property="og:description" content={summary} />
	{/if}
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
	{/if}

	<meta name="twitter:card" content={imageUrl ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={title} />
	{#if summary}
		<meta name="twitter:description" content={summary} />
	{/if}
	{#if imageUrl}
		<meta name="twitter:image" content={imageUrl} />
	{/if}

	{#if jsonLd}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped by jsonLdScript -->
		{@html jsonLdScript(jsonLd)}
	{/if}
</svelte:head>
