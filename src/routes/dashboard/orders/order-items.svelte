<script lang="ts">
	import { Plus, X, Package } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import ComboboxComp from '$lib/formComponents/ComboboxComp.svelte';
	import { fly } from 'svelte/transition';
	import { formatETB } from '$lib/global.svelte';

	type Item = { value: number; name: string };
	type Variant = { value: number; name: string; productId: number; price: string | number | null };

	let {
		form,
		errors,
		productList = [],
		variantList = []
	}: {
		form: any;
		errors: any;
		productList?: Item[];
		variantList?: Variant[];
	} = $props();

	function addLine() {
		$form.selectedItems = [...$form.selectedItems, { productId: 0, variantId: 0, quantity: 1 }];
	}

	function removeLine(i: number) {
		$form.selectedItems.splice(i, 1);
		$form.selectedItems = $form.selectedItems;
	}

	const variantsFor = (productId: number) =>
		productId ? variantList.filter((v) => Number(v.productId) === Number(productId)) : [];

	const priceOf = (variantId: number) => {
		const v = variantList.find((x) => Number(x.value) === Number(variantId));
		return v?.price ? Number(v.price) : 0;
	};

	const lineTotal = (line: { variantId: number; quantity: number }) =>
		priceOf(line.variantId) * (Number(line.quantity) || 0);

	let grandTotal = $derived(
		($form.selectedItems ?? []).reduce(
			(sum: number, line: any) => sum + lineTotal(line),
			0
		)
	);

	// If the product on a line changes, drop a now-invalid variant selection.
	$effect(() => {
		($form.selectedItems ?? []).forEach((line: any, i: number) => {
			if (line.productId && line.variantId) {
				const ok = variantList.some(
					(v) =>
						Number(v.productId) === Number(line.productId) &&
						Number(v.value) === Number(line.variantId)
				);
				if (!ok) $form.selectedItems[i].variantId = 0;
			}
		});
	});
</script>

<div class="flex items-center justify-between">
	<Label class="text-sm font-semibold">Products</Label>
	<Button type="button" size="sm" class="gap-2" onclick={addLine}>
		<Plus class="h-4 w-4" />
		<span>Add Product</span>
	</Button>
</div>

{#if ($form.selectedItems ?? []).length === 0}
	<div
		class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 py-8 text-center text-muted-foreground dark:border-white/10"
	>
		<Package class="h-6 w-6" />
		<p class="text-sm">No products yet — add at least one to create the order.</p>
	</div>
{/if}

{#each $form.selectedItems as line, i (i)}
	<div
		class="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all dark:border-white/10 dark:bg-white/5"
		transition:fly={{ y: 20, duration: 200 }}
	>
		<div
			class="mb-4 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5"
		>
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

		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div class="space-y-1.5">
				<Label class="text-xs font-medium text-slate-500">Product</Label>
				<ComboboxComp
					items={productList}
					name="product-{i}"
					required={true}
					bind:value={$form.selectedItems[i].productId}
				/>
				{#if $errors.selectedItems?.[i]?.productId}
					<p class="text-[11px] font-medium text-destructive">
						{$errors.selectedItems[i].productId}
					</p>
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
					bind:value={$form.selectedItems[i].variantId}
				/>
				{#if $errors.selectedItems?.[i]?.variantId}
					<p class="text-[11px] font-medium text-destructive">
						{$errors.selectedItems[i].variantId}
					</p>
				{/if}
			</div>

			<div class="space-y-1.5">
				<Label class="text-xs font-medium text-slate-500">Quantity</Label>
				<Input
					type="number"
					min="1"
					placeholder="Enter quantity..."
					bind:value={$form.selectedItems[i].quantity}
				/>
				{#if $errors.selectedItems?.[i]?.quantity}
					<p class="text-[11px] font-medium text-destructive">
						{$errors.selectedItems[i].quantity}
					</p>
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

{#if ($form.selectedItems ?? []).length > 0}
	<div
		class="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5"
	>
		<span class="text-sm font-medium text-muted-foreground">Order Total</span>
		<span class="text-lg font-bold">{formatETB(grandTotal)}</span>
	</div>
{/if}