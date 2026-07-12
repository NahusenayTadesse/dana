<script lang="ts">
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		CheckCircle2Icon,
		PackageIcon,
		ReceiptTextIcon,
		ArrowRightIcon,
		SparklesIcon
	} from '@lucide/svelte';
	import { fly, scale } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	type ProductItem = {
		productName: string;
		quantity: number;
		price: number;
	};

	let { productList = [] }: { productList: ProductItem[] } = $props();

	const total = $derived(
		productList.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
	);

	const formatBirr = (amount: number) =>
		new Intl.NumberFormat('en-ET', {
			style: 'currency',
			currency: 'ETB',
			maximumFractionDigits: 2
		}).format(amount);
</script>

<section
	class="relative min-h-dvh overflow-hidden bg-background px-4 py-24 text-foreground sm:px-6 lg:px-8"
>
	<div
		class="absolute top-0 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
	></div>
	<div class="absolute right-0 bottom-0 -z-10 h-96 w-96 rounded-full bg-primary/5 blur-3xl"></div>

	<div class="mx-auto max-w-3xl">
		<div class="mb-8 flex justify-center" in:scale={{ duration: 500 }}>
			<div
				class="relative flex size-24 items-center justify-center rounded-full border border-primary/20 bg-primary/10 shadow-2xl backdrop-blur-2xl"
			>
				<div class="absolute inset-0 animate-ping rounded-full bg-primary/20"></div>
				<CheckCircle2Icon class="relative size-12 text-primary" />
			</div>
		</div>

		<div class="mb-10 text-center" in:fly={{ y: 24, duration: 600 }}>
			<div
				class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-bold tracking-widest text-primary uppercase backdrop-blur-xl"
			>
				<SparklesIcon class="size-3" />
				{m.payment_success_badge()}
			</div>

			<h1 class="text-4xl font-black tracking-tight sm:text-6xl">
				{m.payment_success_title()}
			</h1>

			<p class="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
				{m.payment_success_description()}
			</p>
		</div>
		<div in:fly={{ y: 28, duration: 700, delay: 150 }}>
			<Card class="overflow-hidden border-primary/20 bg-card/40 shadow-2xl backdrop-blur-2xl">
				<CardContent class="p-0">
					<div class="relative overflow-hidden border-b border-primary/10 bg-primary/5 p-6">
						<div class="absolute top-4 right-6 text-7xl font-black text-primary/10">
							{m.payment_success_paid_stamp()}
						</div>

						<div class="relative flex items-start justify-between gap-6">
							<div>
								<div class="mb-2 flex items-center gap-2 text-primary">
									<ReceiptTextIcon class="size-5" />
									<span class="text-xs font-bold tracking-widest uppercase">
										{m.payment_success_order_total()}
									</span>
								</div>

								<p class="text-4xl font-black tracking-tight text-primary">
									{formatBirr(total)}
								</p>
							</div>

							<div
								class="rounded-2xl border border-primary/10 bg-background/50 px-4 py-3 text-right backdrop-blur-xl"
							>
								<p class="text-xs text-muted-foreground">{m.payment_success_items_label()}</p>
								<p class="text-2xl font-bold">{productList.length}</p>
							</div>
						</div>
					</div>

					<div class="space-y-3 p-6">
						{#each productList as item, i}
							<div
								class="group rounded-2xl border border-primary/10 bg-background/50 p-4 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-primary/30 hover:bg-primary/5"
								in:fly={{ y: 18, duration: 500, delay: 250 + i * 80 }}
							>
								<div class="flex items-center gap-4">
									<div
										class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary transition group-hover:scale-110"
									>
										<PackageIcon class="size-5" />
									</div>

									<div class="min-w-0 flex-1">
										<h3 class="truncate text-sm font-bold">
											{item.productName}
										</h3>
										<p class="mt-1 text-xs text-muted-foreground">
											{m.payment_success_quantity_label()}: {item.quantity} × {formatBirr(
												Number(item.price)
											)}
										</p>
									</div>

									<p class="text-sm font-black text-primary">
										{formatBirr(Number(item.price) * item.quantity)}
									</p>
								</div>
							</div>
						{/each}
					</div>

					<Separator class="bg-primary/10" />

					<div class="flex flex-col gap-3 p-6 sm:flex-row">
						<Button href="/shop" class="group flex-1 gap-2">
							{m.payment_success_continue_shopping()}
							<ArrowRightIcon class="size-4 transition-transform group-hover:translate-x-1" />
						</Button>

						<Button
							variant="outline"
							class="flex-1 border-primary/20 bg-background/40 backdrop-blur-xl"
							href="/account/orders"
						>
							{m.payment_success_view_orders()}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	</div>
</section>
