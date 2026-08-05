<script lang="ts">
	import { useCart } from '$lib/hooks/cart.svelte.js';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ShoppingCartIcon,
		SendIcon,
		PackageIcon,
		ArrowLeftIcon,
		UserRoundPlusIcon,
		UserIcon,
		ShieldCheckIcon
	} from '@lucide/svelte';
	import CartItem from '$lib/components/floating-cart/cart-item.svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import Signup from '$lib/forms/Signup.svelte';
	import Login from '$lib/forms/Login.svelte';
	import * as m from '$lib/paraglide/messages.js';

	const cart = useCart();
	let { data } = $props();

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(price);
	};

	const { form, errors, enhance, allErrors, delayed, message } = superForm(data.form, {
		dataType: 'json',
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				cart.clearCart();
				toast.success(m.checkout_quote_success());
			}
		}
	});

	const formattedData = $derived(
		cart?.items.map((item) => ({
			product: item.productId,
			variantId: item.variantId,
			quantity: item.quantity,
			amount: item.specLabel,
			price: item.price,
			priceIncludesVat: item.priceIncludesVat,
			colorId: item.colorId,
			width: item.width,
			widthUnit: item.widthUnit,
			thickness: item.thickness,
			thicknessUnit: item.thicknessUnit,
			length: item.length,
			lengthUnit: item.lengthUnit
		})) || []
	);

	

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	$effect(() => {
		$form.selectedProducts = formattedData;
	});
</script>

<svelte:head>
	<title>{m.checkout_meta_title()}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div
	class="relative min-h-screen bg-linear-to-b from-background via-background/98 to-muted/20 pb-16 text-foreground antialiased selection:bg-primary/20"
>
	<div
		class="pointer-events-none absolute top-0 right-1/4 -z-10 h-200 w-200 rounded-full bg-primary/5 blur-[100px]"
	></div>
	<div
		class="w-[87.5 pointer-events-none absolute bottom-1/3 left-1/4 -z-10 h-87.5 rounded-full bg-blue-500/5 blur-[100px]"
	></div>

	<div class="mx-auto max-w-6xl px-4 py-8 md:py-12">
		<div
			class="mb-8 flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-center sm:justify-between"
		>
			<div class="flex items-center gap-3.5">
				<div class="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-xs">
					<ShoppingCartIcon class="size-5" />
				</div>
				<div>
					<h1 class="text-2xl font-extrabold tracking-tight sm:text-3xl">
						{m.checkout_quote_heading()}
					</h1>
					<p class="text-sm text-muted-foreground">
						{m.checkout_quote_description()}
					</p>
				</div>
			</div>
			<div
				class="flex items-center gap-2 self-start rounded-xl border border-border/80 bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:self-center"
			>
				<ShieldCheckIcon class="size-3.5 text-green-500" />
				<span>{m.checkout_no_payment_note()}</span>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
			<div class="lg:col-span-7">
				<section
					class="rounded-2xl border border-border/80 bg-card/40 p-6 shadow-xs backdrop-blur-md"
				>
					<div class="mb-6 flex items-center gap-2 border-b border-border/60 pb-4">
						<SendIcon class="size-4 text-primary" />
						<h2 class="text-lg font-bold tracking-tight">{m.checkout_customer_verification()}</h2>
					</div>

					{#if !data?.user}
						<div class="space-y-6">
							<div
								class="rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center"
							>
								<p class="mb-4 text-sm text-muted-foreground">
									{m.checkout_guest_message()}
								</p>

								<div class="flex flex-wrap items-center justify-center gap-3">
									<DialogComp
										title={m.checkout_create_profile_account()}
										variant="default"
										IconComp={UserRoundPlusIcon}
									>
										<Signup data={data?.signupForm} action="/signup/?/signup" />
									</DialogComp>

									<DialogComp
										title={m.checkout_login_with_credentials()}
										variant="outline"
										IconComp={UserIcon}
									>
										<Login data={data?.loginForm} action="/login/?/login" />
									</DialogComp>
								</div>
							</div>

							<form
								action="?/add"
								use:enhance
								id="main"
								class="space-y-4"
								method="post"
								enctype="multipart/form-data"
							>
								<Errors allErrors={$allErrors} />
								<InputComp
									label={m.checkout_name_label()}
									name="name"
									type="text"
									{form}
									{errors}
									placeholder={m.checkout_name_placeholder()}
								/>
								<InputComp
									label={m.checkout_email_label()}
									name="email"
									type="email"
									{form}
									{errors}
									placeholder={m.checkout_email_placeholder()}
								/>
								<InputComp
									label={m.checkout_phone_label()}
									name="phone"
									type="text"
									{form}
									{errors}
									placeholder={m.checkout_phone_placeholder()}
									required
								/>
								<InputComp
				label={m.signup_type()}
				name="type"
				type="select"
				items={[
					 { value: 'individual', name: m.signup_type_customer()},
					 { value: 'business', name: m.signup_type_business()},
				]}
				{form}
				{errors}
				placeholder={m.signup_phone_placeholder()}
			/>
   {#if $form.type ===  'business'}
								<InputComp
									label={m.checkout_tin_label()}
									name="tinNo"
									type="number"
									{form}
									{errors}
									placeholder={m.checkout_tin_placeholder()}
								/>

								<InputComp
									label={m.checkout_docs_label()}
									name="docs"
									type="file"
									{form}
									{errors}
									placeholder={m.checkout_docs_placeholder()}
								/>
								{/if}
								<InputComp
									label=""
									name="selectedProducts"
									type="hidden"
									{form}
									{errors}
									placeholder=""
								/>

								<div class="space-y-2 pt-4">
									<Button
										type="submit"
										form="main"
										class="h-12 w-full rounded-xl text-sm font-semibold tracking-wide shadow-md transition-all duration-300 active:scale-98"
										disabled={cart.items.length === 0 || $delayed}
									>
										{#if $delayed}
											<LoadingBtn name={m.checkout_submitting_quote_loading()} />
										{:else}
											{m.checkout_request_quote()}
										{/if}
									</Button>
									<p class="prose-sm max-w-prose rounded-lg border bg-muted p-2 text-center text-xs">
										{m.checkout_quote_followup_note()}
									</p>
								</div>
							</form>
						</div>
					{:else if data?.user}
						<form
							action="?/add"
							use:enhance
							id="main"
							class="space-y-5"
							method="post"
							enctype="multipart/form-data"
						>
							<InputComp
								label=""
								name="selectedProducts"
								type="hidden"
								{form}
								{errors}
								placeholder=""
							/>

							<div
								class="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4 shadow-inner backdrop-blur-xs"
							>
								<div class="space-y-0.5">
									<span
										class="text-[10px] font-bold tracking-widest text-muted-foreground uppercase"
									>
										{m.checkout_authenticated_profile()}
									</span>
									<p class="text-sm font-medium text-foreground">
										{data.user.email || m.checkout_verified_user()}
									</p>
									<p class="text-xs text-muted-foreground">
										{m.checkout_pipeline_items({ count: cart.totalItems })}
									</p>
								</div>
								<div class="text-right">
									<span class="block text-xs text-muted-foreground">
										{m.checkout_estimated_total()}
									</span>
									<span class="font-mono text-lg font-bold text-primary">
										{formatPrice(cart.totalPrice)}
									</span>
								</div>
							</div>

							<div class="space-y-2 pt-4">
								<Button
									type="submit"
									form="main"
									class="h-12 w-full rounded-xl text-sm font-semibold tracking-wide shadow-md transition-all duration-300 active:scale-98"
									disabled={cart.items.length === 0 || $delayed}
								>
									{#if $delayed}
										<LoadingBtn name={m.checkout_submitting_quote_loading()} />
									{:else}
										{m.checkout_request_quote()}
									{/if}
								</Button>
								<p class="prose-sm max-w-prose rounded-lg border bg-muted p-2 text-center text-xs">
									{m.checkout_quote_followup_note()}
								</p>
							</div>
						</form>
					{/if}
				</section>
			</div>

			<div class="lg:col-span-5">
				<div class="sticky top-28 space-y-6">
					<div
						class="rounded-2xl border border-border/80 bg-card/50 p-6 shadow-xs backdrop-blur-md"
					>
						<div class="mb-5 flex items-center justify-between border-b border-border/60 pb-3">
							<h2 class="flex items-center gap-2 text-base font-bold tracking-tight">
								<PackageIcon class="size-4 text-muted-foreground" />
								<span>{m.checkout_manifest_summary()}</span>
							</h2>
							<Badge
								class="rounded-md border-primary/20 bg-primary/10 font-mono text-[11px] font-bold text-primary hover:bg-primary/20"
							>
								{m.checkout_units({ count: cart.totalItems })}
							</Badge>
						</div>

						{#if cart.items.length > 0}
							<ScrollArea class="max-h-96 pr-3">
								<div class="overflow-x-auto">
									<table class="w-full min-w-[520px] border-collapse text-sm">
										<thead>
											<tr class="border-b border-border/60 text-left text-xs text-muted-foreground uppercase">
												<th class="pb-2 font-medium">{m.cart_col_product()}</th>
												<th class="pb-2 font-medium">{m.cart_col_spec()}</th>
												<th class="pb-2 text-right font-medium">{m.cart_col_qty()}</th>
												<th class="pb-2 text-right font-medium">{m.cart_col_unit_price()}</th>
												<th class="pb-2 text-right font-medium">{m.cart_col_total()}</th>
												<th class="pb-2"></th>
											</tr>
										</thead>
										<tbody>
											{#each cart.items as item}
												<CartItem {item} />
											{/each}
										</tbody>
									</table>
								</div>
							</ScrollArea>

							<div class="mt-6 space-y-3 border-t border-border/60 pt-4">
								<div class="flex justify-between text-xs sm:text-sm">
									<span class="text-muted-foreground">{m.checkout_subtotal_allocation()}</span>
									<span class="font-mono font-medium">{formatPrice(cart.totalPrice)}</span>
								</div>
								<div
									class="flex justify-between border-t border-border pt-4 text-base font-bold sm:text-lg"
								>
									<span class="tracking-tight">{m.checkout_estimated_total()}</span>
									<span class="font-mono text-primary">{formatPrice(cart.totalPrice)}</span>
								</div>
								<p class="text-[11px] text-muted-foreground">
									{m.checkout_estimate_disclaimer()}
								</p>
							</div>
						{:else}
							<div class="py-12 text-center">
								<PackageIcon class="mx-auto mb-3.5 size-10 stroke-[1.5] text-muted-foreground/30" />
								<p class="mb-4 text-sm font-medium text-muted-foreground">
									{m.checkout_empty_cart_message()}
								</p>
								<Button
									href="/shop"
									variant="outline"
									class="h-9 gap-2 rounded-xl border-border bg-background/50 text-xs hover:bg-background"
								>
									<ArrowLeftIcon class="size-3.5" />
									<span>{m.checkout_browse_hardware_store()}</span>
								</Button>
							</div>
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
</div>