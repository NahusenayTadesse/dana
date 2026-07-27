<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		SendIcon,
		PackageIcon,
		ArrowLeftIcon,
		UserRoundPlusIcon,
		UserIcon,
		ShieldCheckIcon,
		Layers
	} from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import Signup from '$lib/forms/Signup.svelte';
	import Login from '$lib/forms/Login.svelte';

	let { data } = $props();

	const { form, errors, enhance, allErrors, delayed, message } = superForm(data.form, {
		dataType: 'json',
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				toast.success('Quote request submitted.');
			}
		}
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	function variantSummary() {
		const v = data.variantContext;
		if (!v) return null;
		const parts: string[] = [];
		if (v.colorName) parts.push(v.colorName);

		const widthPart = v.widthLabel || (v.widthValue ? `${v.widthValue}${v.widthUnit ?? ''}` : null);
		if (widthPart) parts.push(widthPart);

		const thicknessPart = v.thicknessValue ? `${v.thicknessValue}${v.thicknessUnit ?? ''}` : null;
		if (thicknessPart) parts.push(thicknessPart);

		const lengthPart =
			v.lengthLabel || (v.lengthValue ? `${v.lengthValue}${v.lengthUnit ?? ''}` : null);
		if (lengthPart) parts.push(v.isCustomLength ? `${lengthPart} (cut to order)` : lengthPart);

		return parts.length ? parts.join(' · ') : (v.sku ?? null);
	}
</script>

<svelte:head>
	<title>Request a Quote</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="relative min-h-screen bg-linear-to-b from-background via-background/98 to-muted/20 pb-16 text-foreground antialiased selection:bg-primary/20">
	<div class="mx-auto max-w-3xl px-4 py-8 md:py-12">
		<div class="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between">
			<div class="flex items-center gap-3.5">
				<div class="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-xs">
					<SendIcon class="size-5" />
				</div>
				<div>
					<h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">Request a Quote</h1>
					<p class="text-sm text-muted-foreground">
						Tell us what you need and our team will follow up with pricing and availability.
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2 self-start rounded-xl border border-border/80 bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:self-center">
				<ShieldCheckIcon class="size-3.5 text-green-500" />
				<span>No payment required</span>
			</div>
		</div>

		{#if data.productContext}
			<div class="mb-6 flex items-center gap-4 rounded-2xl border border-border/80 bg-card/50 p-4 shadow-xs backdrop-blur-md">
				{#if data.variantContext?.imageUrl || data.productContext.featuredImage}
					<img
						src="/files/{data.variantContext?.imageUrl || data.productContext.featuredImage}"
						alt={data.productContext.name}
						class="size-16 shrink-0 rounded-xl object-cover"
					/>
				{:else}
					<div class="flex size-16 shrink-0 items-center justify-center rounded-xl bg-muted">
						<PackageIcon class="size-6 text-muted-foreground/50" />
					</div>
				{/if}
				<div class="min-w-0">
					<p class="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
						Requesting a quote for
					</p>
					<p class="truncate text-sm font-bold">{data.productContext.name}</p>
					{#if variantSummary()}
						<p class="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
							<Layers class="size-3" />
							{variantSummary()}
						</p>
					{/if}
				</div>
			</div>
		{/if}

		<section class="rounded-2xl border border-border/80 bg-card/40 p-6 shadow-xs backdrop-blur-md">
			{#if !data?.user}
				<div class="space-y-6">
					<div class="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center">
						<p class="mb-4 text-sm text-muted-foreground">
							Request a quote as a guest, or sign in for faster follow-up on future orders.
						</p>
						<div class="flex flex-wrap items-center justify-center gap-3">
							<DialogComp title="Create an account" variant="default" IconComp={UserRoundPlusIcon}>
								<Signup data={data?.signupForm} action="/signup/?/signup" />
							</DialogComp>
							<DialogComp title="Log in" variant="outline" IconComp={UserIcon}>
								<Login data={data?.loginForm} action="/login/?/login" />
							</DialogComp>
						</div>
					</div>

					<form action="?/add" use:enhance id="quote-form" class="space-y-4" method="post" enctype="multipart/form-data">
						<Errors allErrors={$allErrors} />
						<InputComp label="Full name" name="name" type="text" {form} {errors} placeholder="Your name" required />
						<InputComp label="Email" name="email" type="email" {form} {errors} placeholder="you@company.com" />
						<InputComp label="Phone" name="phone" type="text" {form} {errors} placeholder="e.g. 09xxxxxxxx" required />
						<InputComp label="WhatsApp (optional)" name="whatsapp" type="text" {form} {errors} placeholder="If different from phone" />
						<InputComp label="Company name" name="companyName" type="text" {form} {errors} placeholder="Company or organization" />
						<InputComp label="TIN number" name="tinNo" type="number" {form} {errors} placeholder="10-digit TIN" />
						<InputComp label="Estimated quantity" name="quantityEstimate" type="text" {form} {errors} placeholder='e.g. "200 sheets" or "5 tons"' />
						<InputComp label="Additional details" name="message" type="textarea" {form} {errors} placeholder="Delivery timeline, site location, anything else we should know." rows={4} />
						<InputComp label="Supporting documents" name="docs" type="file" {form} {errors} placeholder="Optional — TIN certificate, etc." />

						<InputComp label="" name="productId" type="hidden" {form} {errors} placeholder="" />
						<InputComp label="" name="variantId" type="hidden" {form} {errors} placeholder="" />
						<InputComp label="" name="categoryId" type="hidden" {form} {errors} placeholder="" />

						<div class="space-y-2 pt-4">
							<Button type="submit" form="quote-form" class="h-12 w-full rounded-xl text-sm font-semibold tracking-wide shadow-md transition-all duration-300 active:scale-98" disabled={$delayed}>
								{#if $delayed}
									<LoadingBtn name="Submitting..." />
								{:else}
									Submit Quote Request
								{/if}
							</Button>
							<p class="prose-sm max-w-prose rounded-lg border bg-muted p-2 text-center text-xs">
								We typically respond within 1–2 business days.
							</p>
						</div>
					</form>
				</div>
			{:else}
				<form action="?/add" use:enhance id="quote-form" class="space-y-5" method="post" enctype="multipart/form-data">
					<div class="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4 shadow-inner backdrop-blur-xs">
						<div class="space-y-0.5">
							<span class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
								Authenticated profile
							</span>
							<p class="text-sm font-medium text-foreground">{data.user.email}</p>
						</div>
					</div>

					<InputComp label="WhatsApp (optional)" name="whatsapp" type="text" {form} {errors} placeholder="If different from your profile" />
					<InputComp label="Company name" name="companyName" type="text" {form} {errors} placeholder="Company or organization" />
					<InputComp label="Estimated quantity" name="quantityEstimate" type="text" {form} {errors} placeholder='e.g. "200 sheets" or "5 tons"' />
					<InputComp label="Additional details" name="message" type="textarea" {form} {errors} placeholder="Anything else we should know" rows={4} />

					<InputComp label="" name="productId" type="hidden" {form} {errors} placeholder="" />
					<InputComp label="" name="variantId" type="hidden" {form} {errors} placeholder="" />
					<InputComp label="" name="categoryId" type="hidden" {form} {errors} placeholder="" />

					<div class="space-y-2 pt-4">
						<Button type="submit" form="quote-form" class="h-12 w-full rounded-xl text-sm font-semibold tracking-wide shadow-md transition-all duration-300 active:scale-98" disabled={$delayed}>
							{#if $delayed}
								<LoadingBtn name="Submitting..." />
							{:else}
								Submit Quote Request
							{/if}
						</Button>
					</div>
				</form>
			{/if}
		</section>

		<div class="mt-6 text-center">
			<Button href="/shop" variant="ghost" class="gap-2 text-xs text-muted-foreground">
				<ArrowLeftIcon class="size-3.5" />
				Back to shop
			</Button>
		</div>
	</div>
</div>