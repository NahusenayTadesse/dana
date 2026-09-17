<script lang="ts">
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { PackageX as Minus } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { DamagedForm } from '../../routes/dashboard/products/single/[id]/schema';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import { untrack } from 'svelte';

	type Item = { value: number; name: string };

	let isOpen = $state(false);

	let {
		data,
		name = 'item',
		variants = []
	}: {
		data: SuperValidated<DamagedForm>;
		name: string;
		/**
		 * The product's variants. damaged_products has no variant column — the
		 * pick only decides whose stock the damaged units come out of.
		 */
		variants?: Item[];
	} = $props();

	const { form, errors, enhance, delayed, message } = superForm(
		untrack(() => data),
		{}
	);

	// With a single variant there is nothing to choose.
	$effect(() => {
		if (variants.length === 1 && !$form.variantId) {
			$form.variantId = variants[0].value;
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
</script>

<Dialog.Root bind:open={isOpen}>
	<Dialog.Trigger
		class={buttonVariants({ variant: 'destructive' })}
		title="Add Damaged Item of {name}"
	>
		<Minus /> Damaged Item
	</Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>{name} Damaged</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto max-h-[calc(100vh-200px)] rounded-md border p-2">
			{#if variants.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">
					Stock is kept per variant. Add a variant to this product first.
				</p>
			{:else}
				<div class="flex flex-col items-center justify-center gap-4 pt-4">
					<form method="post" action="?/damaged" use:enhance class="flex w-full flex-col gap-3">
						<InputComp
							label="Variant (stock is taken from this variant)"
							name="variantId"
							type="select"
							required={true}
							{form}
							{errors}
							items={variants}
						/>
						<InputComp
							label="Damaged Quantity"
							name="quantity"
							type="number"
							min="1"
							{form}
							{errors}
							placeholder="Enter number of items damaged"
							required={true}
						/>
						<InputComp
							label="Reason"
							name="reason"
							type="textarea"
							{form}
							{errors}
							placeholder="Enter explanation for the damage"
							required={true}
						/>
						<InputComp
							label="Employee Responsible for the damage"
							name="damagedBy"
							type="text"
							{form}
							{errors}
							placeholder="Enter Employee Name"
							required={true}
						/>

						<Button type="submit" variant="destructive" size="lg" disabled={$delayed}>
							{#if $delayed}
								<LoadingBtn name="Entering Damaged Item" />
							{:else}
								<Minus /> Enter Damaged Item
							{/if}
						</Button>
					</form>
				</div>
			{/if}
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
