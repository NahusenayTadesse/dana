<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import {
		CheckCircle2,
		ArrowRight,
		PackageIcon,
		ClipboardList,
		MailCheck,
		PhoneCall
	} from '@lucide/svelte';
	import OrderReceipt from '$lib/components/order-receipt.svelte';
	import OrderProductSummary from '$lib/components/order-product-summary.svelte';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const cart = useCart();
	const reference = $derived(page.url.searchParams.get('ref') ?? '');

	// Snapshot before clearing. The cart was previously emptied inside the
	// checkout page's onResult, which meant the customer's last view of their
	// order was it disappearing. Here it stays on screen — and exportable —
	// while the cart itself is emptied behind it.
	const submitted = $state([...cart.items]);

	// Guarded on `ref`: without it, landing here from a bookmark or a stray link
	// would wipe a cart that was never submitted.
	$effect(() => {
		if (reference && cart.items.length > 0) cart.clearCart();
	});

	const steps = [
		{ icon: MailCheck, title: m.submitted_step_email_title, text: m.submitted_step_email_text },
		{
			icon: ClipboardList,
			title: m.submitted_step_review_title,
			text: m.submitted_step_review_text
		},
		{ icon: PhoneCall, title: m.submitted_step_contact_title, text: m.submitted_step_contact_text }
	];
</script>

<svelte:head>
	<title>{m.submitted_meta_title()}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 md:py-16">
	<div class="mb-8 flex flex-col items-center text-center">
		<div
			class="mb-4 flex size-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
		>
			<CheckCircle2 class="size-7" />
		</div>
		<h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">{m.submitted_heading()}</h1>
		<p class="mt-2 max-w-xl text-sm text-muted-foreground">{m.submitted_description()}</p>

		{#if reference}
			<div class="mt-5 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3 text-center">
				<p class="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
					{m.receipt_reference()}
				</p>
				<p class="font-mono text-xl font-bold text-primary">#{reference}</p>
			</div>
		{/if}
	</div>

	<!-- What happens next, stated rather than left to be guessed. -->
	<section class="mb-8 grid gap-3 sm:grid-cols-3">
		{#each steps as step (step.title)}
			<div class="rounded-2xl border border-border/80 bg-card/40 p-4">
				<step.icon class="mb-2 size-5 text-primary" />
				<h2 class="text-sm font-bold tracking-tight">{step.title()}</h2>
				<p class="mt-1 text-xs text-muted-foreground">{step.text()}</p>
			</div>
		{/each}
	</section>

	{#if submitted.length > 0}
		<section class="mb-8 rounded-2xl border border-border/80 bg-card/50 p-6 shadow-xs">
			<div class="mb-5 flex items-center justify-between gap-3 border-b border-border/60 pb-4">
				<h2 class="flex items-center gap-2 text-lg font-bold tracking-tight">
					<PackageIcon class="size-4.5 text-primary" />
					<span>{m.submitted_what_you_sent()}</span>
				</h2>
				<OrderReceipt
					items={submitted}
					{reference}
					fileName="dana-quote-{reference || 'request'}"
					heading={m.receipt_quote_heading()}
					customer={data?.user ? { name: data.user.name, email: data.user.email } : null}
				/>
			</div>

			<OrderProductSummary
				items={submitted}
				heading
				exportable
				fileName="dana-quote-{reference || 'request'}-summary"
			/>
		</section>
	{/if}

	<div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
		<Button href="/account/orders" size="lg" class="gap-2">
			{m.submitted_track_order()}
			<ArrowRight class="size-4" />
		</Button>
		<Button href="/shop" variant="outline" size="lg">{m.submitted_keep_browsing()}</Button>
	</div>
</div>
