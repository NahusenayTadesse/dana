<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { edit } from './schema.js';
	let { data } = $props();

	import SingleTable from '$lib/components/SingleTable.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { superForm } from 'sveltekit-superforms/client';
	import { page } from '$app/state';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { ArrowLeft, Pencil, Save, History, X, Plus, ArrowDown, Tag } from '@lucide/svelte';
	import type { Snapshot } from '@sveltejs/kit';
	import { getCurrentMonthRange, formatETB } from '$lib/global.svelte';
	import Delete from '$lib/forms/Delete.svelte';
	import SingleView from '$lib/components/SingleView.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import Adjustment from '$lib/forms/Adjustment.svelte';
	import Damaged from '$lib/forms/Damaged.svelte';

	function scrollToVariants() {
		const element = document.getElementById('variant-section-anchor');
		if (element) {
			element.scrollIntoView({ behavior: 'smooth' });
		}
	}

	// Products no longer carry a single price — derive a range from the variants.
	let priceRange = $derived.by(() => {
		const priced = (data?.variants ?? [])
			.map((v) => Number(v.price))
			.filter((n) => !Number.isNaN(n) && n > 0);
		if (priced.length === 0) return 'Quote only';
		const min = Math.min(...priced);
		const max = Math.max(...priced);
		return min === max ? formatETB(min) : `${formatETB(min)} – ${formatETB(max)}`;
	});

	let singleTable = $derived([
		{ name: 'Name', value: data.product?.name },
		{ name: 'Price Range', value: priceRange },
		{ name: 'Variants', value: `${(data?.variants ?? []).length} variant(s)` },
		{ name: 'Available Quantity', value: data.product?.quantity },
		{ name: 'Product Description', value: data.product?.description },
		{ name: 'Commission', value: data.product?.commission },
		{ name: 'Reorder Notification Quantity', value: data.product?.reorderLevel },
		{ name: 'Product Supplier', value: data?.product?.supplier },
		{ name: 'Added On', value: data.product?.createdAt },
		{ name: 'Added By', value: data.product?.createdBy },
		{
			name: 'Number of Sells',
			value:
				data.product?.saleCount === null || data.product?.saleCount === undefined
					? '0 Pieces Sold'
					: data.product?.saleCount + ' Pieces Sold'
		}
	]);

	const { form, errors, enhance, delayed, capture, restore, allErrors, message } = superForm(
		data.form,
		{
			validators: zod4Client(edit),
			resetForm: false,
			dataType: 'json'
		}
	);

	// Values come prefilled from `load` (see +layout.server.ts) — no client patch.

	export const snapshot: Snapshot = { capture, restore };

	let editForm = $state(false);
	let editGallery = $state(false);
	import { toast } from 'svelte-sonner';
	import Gallery from '$lib/components/gallery.svelte';
	import EditGallery from './editGallery.svelte';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import EditVariant from './EditVariant.svelte';
	import AddVariant from './AddVariant.svelte';
	import VariantPrices from './VariantPrices.svelte';
	import ImageViewer from '$lib/components/Table/image-viewer.svelte';

	// Sortable column header helper (keeps the column defs tidy).
	const sortableHeader = (name: string) => ({ column }: { column: any }) =>
		renderComponent(DataTableSort, {
			name,
			onclick: column.getToggleSortingHandler()
		});

	const columns = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1,
			sortable: false
		},
		{
			accessorKey: 'imageUrl',
			header: "Image",
			sortable: true,
			cell: ({ row }) =>
				renderComponent(ImageViewer, {
					 src: row.original.imageUrl,
					 alt: row.original.sku
				})
		
		},
		{
			accessorKey: 'sku',
			header: sortableHeader('SKU'),
			sortable: true,
			cell: ({ row }) => row.original.sku ?? '—'
		},
		{
			accessorKey: 'colorName',
			header: sortableHeader('Colour'),
			sortable: true,
			cell: ({ row }) => row.original.colorName ?? '—'
		},
		{
			id: 'width',
			accessorFn: (row) => (row.width != null ? Number(row.width) : null),
			header: sortableHeader('Width'),
			sortable: true,
			cell: ({ row }) =>
				row.original.width ? `${Number(row.original.width)}${row.original.widthUnit}` : '—'
		},
		{
			id: 'thickness',
			accessorFn: (row) => (row.thickness != null ? Number(row.thickness) : null),
			header: sortableHeader('Thickness'),
			sortable: true,
			cell: ({ row }) =>
				row.original.thickness
					? `${Number(row.original.thickness)}${
							row.original.thicknessUnit === 'gauge' ? ' ga' : row.original.thicknessUnit
						}`
					: '—'
		},
		{
			id: 'length',
			accessorFn: (row) => (row.length != null ? Number(row.length) : null),
			header: sortableHeader('Length'),
			sortable: true,
			cell: ({ row }) =>
				row.original.length ? `${Number(row.original.length)}${row.original.lengthUnit}` : '—'
		},
		{
			id: 'price',
			accessorFn: (row) => (row.price != null ? Number(row.price) : null),
			header: sortableHeader('Price'),
			sortable: true,
			cell: ({ row }) =>
				row.original.price ? formatETB(Number(row.original.price)) : 'Quote only'
		},
		{
			accessorKey: 'quantity',
			header: sortableHeader('Qty'),
			sortable: true,
			cell: ({ row }) => row.original.quantity
		},
		{
			accessorKey: 'actions',
			header: 'Edit',
			sortable: false,
			cell: ({ row }) =>
				renderComponent(EditVariant, {
					data: data?.editVariantForm,
					variant: row.original,
					colorItems: data?.colorItems,
					widthItems: data?.widthItems,
					thicknessItems: data?.thicknessItems,
					lengthItems: data?.lengthItems,

				})
		},
		{
			accessorKey: 'prices',
			header: 'Prices',
			sortable: false,
			cell: ({ row }) =>
				renderComponent(VariantPrices, {
					variantId: row.original.id,
					variantLabel: row.original.sku ?? row.original.colorName ?? `Variant #${row.original.id}`,
					rates: data?.variantPricesByVariant?.[row.original.id] ?? [],
					upsertData: data?.upsertVariantPriceForm,
					deleteData: data?.deleteVariantPriceForm
				})
		}
	];

	let images = $derived(data?.images);

	const soldByItems = [
		{ value: 'quantity', name: 'Quantity (per piece)' },
		{ value: 'length', name: 'Length (e.g. per meter)' },
		{ value: 'both', name: 'Both' }
	];
	const lengthUnitItems = [
		{ value: 'mm', name: 'mm' },
		{ value: 'm', name: 'm' },
		{ value: 'ft', name: 'ft' }
	];
</script>

<svelte:head>
	<title>Product Details</title>
</svelte:head>

<SingleView title={data?.product?.name} photo={String(data?.product?.image)} class="w-full!">
	<div class="mt-4 flex w-full flex-row flex-wrap items-start justify-start gap-2 pl-4">
		<Button onclick={() => (editForm = !editForm)}>
			{#if !editForm}
				<Pencil class="h-4 w-4" />
				Edit
			{:else}
				<ArrowLeft class="h-4 w-4" />
				Back
			{/if}
		</Button>
		{#key data?.product}
			<Adjustment data={data.adjustForm} name={data.product?.name} />
		{/key}
		<Button href="/dashboard/products/single/{page.params.id}/ranges/{getCurrentMonthRange()}">
			<History /> See Change History
		</Button>
		<Damaged data={data.damagedForm} name={data.product?.name} />
		<Button href={`/dashboard/products/single/${page.params.id}/damaged/${getCurrentMonthRange()}`}>
			<History /> See Damaged History
		</Button>

		<Delete redirect="/dashboard/products" />
	</div>
	{#if data.variants.length === 0}
		<div
			class="mx-auto my-12 flex w-1/2 flex-col items-center rounded-xl border border-destructive p-8 text-center text-destructive backdrop-blur-sm"
		>
			<div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full">
				<Tag class="h-6 w-6" />
			</div>

			<h3 class="text-lg font-bold">Variant Required</h3>
			<p class="mx-auto mt-2 max-w-sm text-sm leading-relaxed">
				This product is currently hidden from customers. Add at least one variant to enable
				purchasing.
			</p>

			<Button variant="default" class="mt-4" onclick={scrollToVariants}>
				<Plus class="mr-2 h-4 w-4" />
				Add Product Variant
			</Button>
		</div>
	{/if}
	{#if editForm === false}
		<div class="w-full p-4">
			<SingleTable {singleTable} />
			<section
				class="mx-auto w-full max-w-4xl space-y-8 rounded-xl border border-border bg-background p-6 text-foreground"
			>
				<div class="space-y-4">
					<div class="border-b border-border pb-2">
						<h3 class="text-lg font-semibold tracking-tight text-foreground">Categories</h3>
						<p class="text-sm text-muted-foreground">
							The primary classifications for this product.
						</p>
					</div>

					{#if data?.categorized.length === 0}
						<p class="text-sm text-muted-foreground italic">No categories assigned.</p>
					{:else}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each data?.categorized as category}
								<div
									class="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:bg-accent/50"
								>
									<h4 class="text-sm font-medium text-foreground sm:text-base">
										{category.name}
									</h4>
									{#if category.description}
										<p class="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
											{category.description}
										</p>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<div class="space-y-4">
					<div class="border-b border-border pb-2">
						<h3 class="text-lg font-semibold tracking-tight text-foreground">Tags</h3>
						<p class="text-sm text-muted-foreground">Keywords and discoverability labels.</p>
					</div>

					{#if data?.tagged.length === 0}
						<p class="text-sm text-muted-foreground italic">No tags assigned.</p>
					{:else}
						<div class="flex flex-wrap gap-2">
							{#each data?.tagged as tag}
								<span
									class="inline-flex cursor-default items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary/80"
								>
									{tag.name}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		</div>
	{/if}
	{#if editForm}
		<div class="w-full p-4">
			<form
				action="?/editProduct"
				use:enhance
				class="flex w-full flex-col items-start justify-start gap-4 lg:w-full"
				id="edit"
				method="post"
				enctype="multipart/form-data"
			>
				<Errors allErrors={$allErrors} />

				<InputComp
					{form}
					{errors}
					type="file"
					name="image"
					label="Product Image"
					placeholder="Upload Product Image"
					image={String(data?.product?.image)}
				/>
				<InputComp
					{form}
					{errors}
					type="text"
					name="productName"
					label="Product Name"
					placeholder="Enter Product Name"
					required
				/>
				<InputComp
					{form}
					{errors}
					type="text"
					name="brand"
					label="Brand"
					placeholder="Enter Product Brand"
					required
				/>
				<InputComp
					{form}
					{errors}
					type="checkbox"
					name="category"
					label="Product Category"
					placeholder="Select Product Categories"
					required
					items={data?.allCategories}
				/>
				<InputComp
					{form}
					{errors}
					type="checkbox"
					name="tag"
					label="Product Tags"
					placeholder="Select Product Tags"
					items={data?.allTags}
				/>

				<InputComp
					{form}
					{errors}
					type="textarea"
					name="description"
					label="Product Description"
					placeholder="Enter Product Description"
				/>

				<InputComp
					{form}
					{errors}
					type="number"
					name="commission"
					label="Commission Amount"
					placeholder="Enter commission earned per sale"
		
				/>

				<InputComp
					{form}
					{errors}
					type="number"
					name="quantity"
					label="Quantity"
					placeholder="Enter the number of items the product currently has"
				/>

				<InputComp
					{form}
					{errors}
					type="select"
					name="supplier"
					label="Product Supplier"
					placeholder="Select Supplier"
					items={data?.supplierList}
				/>

				<InputComp
					{form}
					{errors}
					type="number"
					name="reorderLevel"
					label="Reorder Notify Level"
					placeholder="Enter when you want to be notified"
				/>

				<InputComp
					{form}
					{errors}
					type="select"
					name="soldBy"
					label="Sold By"
					placeholder="Select how this product is sold"
					items={soldByItems}
				/>

				<InputComp
					{form}
					{errors}
					type="text"
					name="thickness"
					label="Thickness"
					placeholder="e.g. 0.5mm - 1.2mm"
				/>

				<InputComp
					{form}
					{errors}
					type="text"
					name="width"
					label="Width"
					placeholder="e.g. 1219mm"
				/>

				<InputComp
					{form}
					{errors}
					type="number"
					name="maxLength"
					label="Max Order Length"
					placeholder="Cap for custom quote requests"
				/>

				<InputComp
					{form}
					{errors}
					type="select"
					name="maxLengthUnit"
					label="Max Length Unit"
					placeholder="Select unit"
					items={lengthUnitItems}
				/>

				<InputComp
					{form}
					{errors}
					type="text"
					name="coatingType"
					label="Coating Type"
					placeholder="e.g. PPGI, GI"
				/>

				<InputComp
					{form}
					{errors}
					type="text"
					name="colorOptions"
					label="Color Options"
					placeholder="e.g. RAL 9002, Sea Blue"
				/>

				<InputComp
					{form}
					{errors}
					type="text"
					name="sizeRange"
					label="Size Range"
					placeholder="e.g. Custom Lengths"
				/>

				<InputComp
					{form}
					{errors}
					type="text"
					name="finish"
					label="Finish"
					placeholder="e.g. Matt, Glossy"
				/>

				<Button form="edit" type="submit" class="mt-4">
					{#if $delayed}
						<LoadingBtn name="Saving Changes" />
					{:else}
						<Save class="h-4 w-4" />
						Save Changes
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</SingleView>
<div id="variant-section-anchor" class="mx-auto my-12 px-4 pt-12 sm:px-6 lg:px-4">
	{#key data?.variants}
		<div class="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-4">
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">Variants &amp; Pricing</h1>
			<div class="w-sm">
				<AddVariant
					data={data?.addVariantForm}
					colorItems={data?.colorItems}
					widthItems={data?.widthItems}
					thicknessItems={data?.thicknessItems}
					lengthItems={data?.lengthItems}
				/>
			</div>
			{#if data.variants.length === 0}
				<p class="animate-pulse text-destructive">No variants available for this product.</p>
			{:else}
				<DataTable
					{columns}
					data={data?.variants}
	
					fileName="{data?.product?.name} - Variants"
					search={true}
				/>
			{/if}
		</div>
	{/key}
</div>

<div class="mx-auto my-12 px-4 sm:px-6 lg:px-4">
	{#if data?.product?.name}
		<div class="mb-6 border-b border-gray-100 pb-4">
			<nav class="mb-2 text-xs font-medium tracking-wider text-gray-400 uppercase">
				Gallery Images
			</nav>
			<h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
				{data.product.name}
			</h1>
		</div>
	{/if}

	<div
		class="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl transition-shadow hover:shadow-2xl"
	>
		<div class="p-3 sm:p-6">
			<Button onclick={() => (editGallery = !editGallery)} class="mb-4">
				{#if !editGallery}
					<Pencil class="h-4 w-4" />
					Edit
				{:else}
					<ArrowLeft class="h-4 w-4" />
					Back
				{/if}
			</Button>

			{#if !editGallery}
				<Gallery {images} title={data?.product?.name} />
			{:else}
				<EditGallery data={data?.galleryEdit} bind:images />
			{/if}
		</div>
	</div>
</div>