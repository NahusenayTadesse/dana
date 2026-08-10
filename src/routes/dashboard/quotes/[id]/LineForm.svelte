<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, Plus, SquarePen, Trash2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';

	import type { addLine, updateLine } from './schema';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';

	type Item = { value: number; name: string };
	type Rate = { basis: string; price: string | number; priceIncludesVat: boolean | null };
	type Line = {
		id: number;
		productId: number | null;
		variantId: number | null;
		quantity: number | null;
		length: string | number | null;
		lengthUnit: string | null;
		thickness: string | number | null;
		thicknessUnit: string | null;
		width: string | number | null;
		widthUnit: string | null;
		weight: string | number | null;
		weightUnit: string | null;
		colorId: number | null;
		priceBasis: string;
		price: string | number | null;
		priceIncludesVat: boolean | null;
	};

	let {
		mode = 'add',
		data,
		orderId,
		line,
		productList = [],
		variantList = [],
		ratesByVariant = {},
		colorList = []
	}: {
		mode?: 'add' | 'edit';
		// add/edit share this component; loosely typed since the two schemas
		// differ only by the `id` field and a strict union confuses inference.
		data: SuperValidated<Record<string, any>>;
		orderId: number;
		line?: Line;
		productList?: Item[];
		variantList?: (Item & { productId: number })[];
		ratesByVariant?: Record<number, Rate[]>;
		colorList?: Item[];
	} = $props();

	const basisItems = [
		{ value: 'quantity', name: 'Per piece' },
		{ value: 'length', name: 'Per length (e.g. meter)' },
		{ value: 'width', name: 'Per width' },
		{ value: 'thickness', name: 'Per thickness' },
		{ value: 'color', name: 'Per colour' },
		{ value: 'weight', name: 'Per weight (kg/ton)' },
		{ value: 'area', name: 'Per area (m²)' }
	];
	const lengthUnitItems = [
		{ value: 'mm', name: 'mm' },
		{ value: 'm', name: 'm' },
		{ value: 'ft', name: 'ft' }
	];
	const widthUnitItems = [
		{ value: 'mm', name: 'mm' },
		{ value: 'cm', name: 'cm' },
		{ value: 'm', name: 'm' },
		{ value: 'in', name: 'in' },
		{ value: 'ft', name: 'ft' }
	];
	const thicknessUnitItems = [
		{ value: 'mm', name: 'mm' },
		{ value: 'gauge', name: 'gauge' }
	];
	const weightUnitItems = [
		{ value: 'kg', name: 'kg' },
		{ value: 'ton', name: 'ton' }
	];

	const { form, errors, enhance, delayed, message } = superForm(data, {
		id: mode === 'edit' ? `edit-line-${line?.id}` : 'add-line',
		dataType: 'json',
		resetForm: mode === 'add'
	});

	$form.orderId = orderId;
	if (mode === 'edit' && line) {
		form.update(
			(f) => ({
				...f,
				id: line.id,
				orderId,
				productId: line.productId,
				variantId: line.variantId,
				quantity: line.quantity,
				length: line.length != null ? Number(line.length) : null,
				lengthUnit: line.lengthUnit ?? 'm',
				thickness: line.thickness != null ? Number(line.thickness) : null,
				thicknessUnit: line.thicknessUnit ?? 'mm',
				width: line.width != null ? Number(line.width) : null,
				widthUnit: line.widthUnit ?? 'mm',
				weight: line.weight != null ? Number(line.weight) : null,
				weightUnit: line.weightUnit ?? 'kg',
				colorId: line.colorId,
				basis: line.priceBasis,
				unitPrice: line.price != null ? Number(line.price) : 0,
				priceIncludesVat: !!line.priceIncludesVat
			}),
			{ taint: false }
		);
	}

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else toast.success($message.text);
		}
	});

	const productVariants = $derived(
		$form.productId ? variantList.filter((v) => Number(v.productId) === Number($form.productId)) : []
	);
	const availableRates = $derived($form.variantId ? (ratesByVariant[Number($form.variantId)] ?? []) : []);

	function applyRate(rate: Rate) {
		$form.basis = rate.basis;
		$form.unitPrice = Number(rate.price);
		$form.priceIncludesVat = !!rate.priceIncludesVat;
	}
</script>

<DialogComp
	title={mode === 'add' ? 'Add Order Line' : 'Edit Order Line'}
	variant={mode === 'add' ? 'default' : 'ghost'}
	IconComp={mode === 'add' ? Plus : SquarePen}
	size="lg"
>
	<div class="flex flex-col gap-4 pt-4">
		<form
			method="post"
			action={mode === 'add' ? '?/addLine' : '?/updateLine'}
			use:enhance
			class="flex w-full flex-col gap-3"
		>
			{#if mode === 'edit'}
				<input type="hidden" name="id" bind:value={$form.id} />
			{/if}
			<input type="hidden" name="orderId" bind:value={$form.orderId} />

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<InputComp {form} {errors} type="select" name="productId" label="Product" placeholder="Select product" items={productList} />
				<InputComp
					{form}
					{errors}
					type="select"
					name="variantId"
					label="Suggested Variant (optional)"
					placeholder="No specific variant"
					items={productVariants}
				/>
			</div>

			{#if availableRates.length > 0}
				<div class="flex flex-col gap-1.5 rounded-lg border border-dashed p-3">
					<p class="text-xs text-muted-foreground">Standard rates for this variant — click to apply:</p>
					<div class="flex flex-wrap gap-2">
						{#each availableRates as rate}
							<Button type="button" size="sm" variant="outline" onclick={() => applyRate(rate)}>
								{rate.basis}: {rate.price}{rate.priceIncludesVat ? ' (incl. VAT)' : ''}
							</Button>
						{/each}
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
				<InputComp {form} {errors} type="select" name="basis" label="Price Basis" placeholder="Select basis" items={basisItems} />
				<InputComp {form} {errors} type="number" name="unitPrice" label="Unit Rate (ETB)" placeholder="0.00" />
				<InputComp {form} {errors} type="checkboxSingle" name="priceIncludesVat" label="" placeholder="Rate includes VAT" />
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<InputComp {form} {errors} type="number" name="quantity" label="Quantity (pieces)" placeholder="0" />
				<InputComp {form} {errors} type="select" name="colorId" label="Colour" placeholder="No specific colour" items={colorList} />
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<InputComp {form} {errors} type="number" name="length" label="Length" placeholder="0" />
				<InputComp {form} {errors} type="select" name="lengthUnit" label="Length Unit" placeholder="Unit" items={lengthUnitItems} />
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<InputComp {form} {errors} type="number" name="width" label="Width" placeholder="0" />
				<InputComp {form} {errors} type="select" name="widthUnit" label="Width Unit" placeholder="Unit" items={widthUnitItems} />
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<InputComp {form} {errors} type="number" name="thickness" label="Thickness" placeholder="0" />
				<InputComp
					{form}
					{errors}
					type="select"
					name="thicknessUnit"
					label="Thickness Unit"
					placeholder="Unit"
					items={thicknessUnitItems}
				/>
			</div>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<InputComp {form} {errors} type="number" name="weight" label="Weight" placeholder="0" />
				<InputComp {form} {errors} type="select" name="weightUnit" label="Weight Unit" placeholder="Unit" items={weightUnitItems} />
			</div>

			<div class="flex flex-wrap gap-2">
				<Button type="submit" size="lg" disabled={$delayed}>
					{#if $delayed}
						<LoadingBtn name="Saving Line" />
					{:else}
						<Save class="mr-2 h-4 w-4" /> Save Line
					{/if}
				</Button>

				{#if mode === 'edit'}
					<Button type="submit" variant="destructive" size="lg" formaction="?/deleteLine" disabled={$delayed}>
						<Trash2 class="mr-2 h-4 w-4" /> Delete
					</Button>
				{/if}
			</div>
		</form>
	</div>
</DialogComp>
