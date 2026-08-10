<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { fly } from 'svelte/transition';

	import { Plus, X, Save, SquarePen, Trash2, Package, ShieldCheck } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import Errors from '$lib/formComponents/Errors.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { formatETB } from '$lib/global.svelte';

	type Item = { value: number; name: string };
	type Variant = { value: number; name: string; productId: number; price: string | number | null };
	type Order = {
		id: number;
		customerId: number;
		status: string;
		paymentMethod?: number | null;
		recieptLink?: string | null;
		txnRef?: string | null;
		paymentStatus?: string | null;
		name?: string;
	};
	type LineSource = {
		orderId: number | string;
		productId: number | string;
		variantId: number | string;
		quantity: number | string;
	};

	let {
		mode = 'add',
		data,
		order,
		orderItems = [],
		customerList = [],
		productList = [],
		variantList = [],
		paymentMethodList = []
	}: {
		mode?: 'add' | 'edit';
		data: SuperValidated<any>;
		order?: Order;
		orderItems?: LineSource[];
		customerList?: Item[];
		productList?: Item[];
		variantList?: Variant[];
		paymentMethodList?: Item[];
	} = $props();

	// The gateway already settled this order → hide manual payment fields.
	const gatewayPaid = mode === 'edit' && !!order?.txnRef && order?.paymentStatus === 'paid';

	const { form, errors, enhance, delayed, message, allErrors } = superForm(data, {
		resetForm: false,
		dataType: 'json'
	});

	if (mode === 'edit' && order) {
		$form.id = order.id;
		$form.customer = order.customerId;
		$form.status = order.status;
		$form.gatewayPaid = gatewayPaid;
		if (order.paymentMethod) $form.paymentMethod = order.paymentMethod;
		$form.items = orderItems
			.filter((it) => Number(it.orderId) === Number(order.id))
			.map((it) => ({
				productId: Number(it.productId),
				variantId: Number(it.variantId),
				quantity: Number(it.quantity)
			}));
	} else if (!$form.items) {
		$form.items = [];
	}

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else toast.success($message.text);
		}
	});

	const addLine = () => ($form.items = [...$form.items, { productId: 0, variantId: 0, quantity: 1 }]);
	const removeLine = (i: number) => {
		$form.items.splice(i, 1);
		$form.items = $form.items;
	};
	const variantsFor = (productId: number) =>
		productId ? variantList.filter((v) => Number(v.productId) === Number(productId)) : [];
	const priceOf = (variantId: number) =>
		Number(variantList.find((v) => Number(v.value) === Number(variantId))?.price ?? 0);
	const lineTotal = (l: { variantId: number; quantity: number }) =>
		priceOf(l.variantId) * (Number(l.quantity) || 0);

	let grandTotal = $derived(($form.items ?? []).reduce((s, l) => s + lineTotal(l), 0));

	$effect(() => {
		($form.items ?? []).forEach((line, i) => {
			if (line.productId && line.variantId) {
				const ok = variantList.some(
					(v) => Number(v.productId) === Number(line.productId) && Number(v.value) === Number(line.variantId)
				);
				if (!ok) $form.items[i].variantId = 0;
			}
		});
	});

	const formId = mode === 'edit' ? 'order-edit' : 'order-add';
</script>

<DialogComp
	title={mode === 'add' ? '+ Add New Order' : order?.name || 'Edit Order'}
	variant={mode === 'add' ? 'default' : 'ghost'}
	IconComp={mode === 'edit' ? SquarePen : undefined}
>
	<form
		action={mode === 'add' ? '?/add' : '?/edit'}
		use:enhance
		method="post"
		id={formId}
		class="mt-4 flex flex-col gap-4"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />

		<InputComp label="Customer" name="customer" type="combo" {form} {errors} items={customerList} />

		<!-- Line items -->
		<div class="flex items-center justify-between">
			<Label class="text-sm font-semibold">Products</Label>
			<Button type="button" size="sm" class="gap-2" onclick={addLine}>
				<Plus class="h-4 w-4" /> Add Product
			</Button>
		</div>

		{#if ($form.items ?? []).length === 0}
			<div
				class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-8 text-center text-muted-foreground dark:border-white/10"
			>
				<Package class="h-6 w-6" />
				<p class="text-sm">No products yet — add at least one.</p>
			</div>
		{/if}

		{#each $form.items as line, i (i)}
			<div
				class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/5"
				transition:fly={{ y: 20, duration: 200 }}
			>
				<div class="mb-3 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5">
					<span class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
						Item #{i + 1}
					</span>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						class="h-8 w-8 rounded-full p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
						onclick={() => removeLine(i)}
					>
						<X class="h-4 w-4" />
						<span class="sr-only">Remove item</span>
					</Button>
				</div>

				<div class="grid grid-cols-1 gap-4">
					<div class="space-y-1.5">
						<Label class="text-xs font-medium text-slate-500">Product</Label>
						<ComboboxComp
							items={productList}
							name="product-{i}"
							required={true}
							bind:value={$form.items[i].productId}
						/>
						{#if $errors.items?.[i]?.productId}
							<p class="text-[11px] font-medium text-destructive">{$errors.items[i].productId}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-medium text-slate-500">Variant</Label>
						<ComboboxComp
							items={line.productId
								? variantsFor(line.productId)
								: [{ value: '', name: 'Select a product first' }]}
							name="variant-{i}"
							required={true}
							bind:value={$form.items[i].variantId}
						/>
						{#if $errors.items?.[i]?.variantId}
							<p class="text-[11px] font-medium text-destructive">{$errors.items[i].variantId}</p>
						{/if}
					</div>

					<div class="space-y-1.5">
						<Label class="text-xs font-medium text-slate-500">Quantity</Label>
						<Input type="number" min="1" bind:value={$form.items[i].quantity} placeholder="Qty" />
						{#if $errors.items?.[i]?.quantity}
							<p class="text-[11px] font-medium text-destructive">{$errors.items[i].quantity}</p>
						{/if}
					</div>

					<div class="flex flex-col justify-end space-y-1.5">
						<Label class="text-xs font-medium text-slate-500">Subtotal</Label>
						<div
							class="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-semibold dark:border-white/10 dark:bg-white/5"
						>
							{line.variantId ? formatETB(lineTotal(line)) : '—'}
						</div>
					</div>
				</div>
			</div>
		{/each}

		{#if ($form.items ?? []).length > 0}
			<div
				class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
			>
				<span class="text-sm font-medium text-muted-foreground">Order Total</span>
				<span class="text-lg font-bold">{formatETB(grandTotal)}</span>
			</div>
		{/if}

		<InputComp
			label="Status"
			name="status"
			type="select"
			{form}
			{errors}
			items={[
				{ value: 'pending', name: 'Pending' },
				{ value: 'delivered', name: 'Delivered' },
				{ value: 'cancelled', name: 'Cancelled' }
			]}
		/>

		{#if $form.status === 'delivered'}
			{#if gatewayPaid}
				<!-- Settled by the payment gateway — no manual entry needed -->
				<div
					class="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-green-800 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
				>
					<ShieldCheck class="mt-0.5 h-5 w-5 shrink-0" />
					<div class="text-sm">
						<p class="font-semibold">Paid online via gateway</p>
						<p class="mt-0.5 break-all opacity-80">Token: {order?.txnRef}</p>
					</div>
				</div>
			{:else}
				<InputComp
					label="Payment Method"
					name="paymentMethod"
					type="combo"
					{form}
					{errors}
					items={paymentMethodList}
				/>
				<InputComp
					label="Receipt"
					name="reciept"
					type="file"
					{form}
					{errors}
					image={order?.recieptLink ?? ''}
					placeholder="Upload screenshot or PDF of receipt"
				/>
			{/if}
		{/if}

		<Button type="submit" class="mt-2" form={formId} disabled={$delayed}>
			{#if $delayed}
				<LoadingBtn name="Saving" />
			{:else if mode === 'add'}
				<Plus class="h-4 w-4" /> Add Order
			{:else}
				<Save class="h-4 w-4" /> Save Changes
			{/if}
		</Button>
	</form>

	{#if mode === 'edit' && order}
		<form action="?/delete" method="post" class="mt-2">
			<input type="hidden" name="id" value={order.id} />
			<Button
				type="submit"
				variant="destructive"
				class="w-full"
				onclick={(e) => {
					if (!confirm('Delete this order? This cannot be undone.')) e.preventDefault();
				}}
			>
				<Trash2 class="h-4 w-4" /> Delete Order
			</Button>
		</form>
	{/if}
</DialogComp>