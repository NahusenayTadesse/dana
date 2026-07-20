<script lang="ts">
    import type { Snapshot } from '@sveltejs/kit';

    import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
    import { Input } from '$lib/components/ui/input/index.js';
    import { Label } from '$lib/components/ui/label/index.js';

    import { Plus, X } from '@lucide/svelte';
    import { Button } from '$lib/components/ui/button/index.js';
    import { zod4Client } from 'sveltekit-superforms/adapters';
    import { add as schema } from './schema';
    import { superForm } from 'sveltekit-superforms/client';
    import Errors from '$lib/formComponents/Errors.svelte';
    import FormCard from '$lib/formComponents/FormCard.svelte';
    import InputComp from '$lib/formComponents/InputComp.svelte';

    let { data } = $props();

    const { form, errors, enhance, delayed, allErrors, capture, restore, message } = superForm(
        data.form,
        {
            taintedMessage: () => {
                return new Promise((resolve) => {
                    resolve(window.confirm('Do you want to leave?\nChanges you made may not be saved.'));
                });
            },
            validators: zod4Client(schema),
            dataType: 'json'
        }
    );

    export const snapshot: Snapshot = { capture, restore };

    import { toast } from 'svelte-sonner';
    $effect(() => {
        if ($message) {
            if ($message.type === 'error') {
                toast.error($message.text);
            } else {
                toast.success($message.text);
            }
        }
    });

    let images = $state([]);
</script>

<svelte:head>
    <title>Add New Product Item</title>
</svelte:head>

<FormCard
    title="Add A Product Item"
    description="Add New Inventory Items to track specifications and stock levels"
>
    <form
        use:enhance
        action="?/addProduct"
        id="main"
        class="flex flex-col gap-6"
        method="POST"
        enctype="multipart/form-data"
    >
        <Errors allErrors={$allErrors} />

        <!-- Core Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputComp
                {form}
                {errors}
                type="text"
                name="name"
                label="Product Name"
                placeholder="Enter Product Name"
                required
            />

            <InputComp
                {form}
                {errors}
                type="text"
                name="slug"
                label="Slug"
                placeholder="product-url-slug"
                required
            />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputComp
                {form}
                {errors}
                type="text"
                name="brand"
                label="Brand Name"
                placeholder="Enter Brand Name"
            />
            
            <InputComp
                {form}
                {errors}
                type="select"
                name="categoryId"
                label="Product Category"
                placeholder="Select a category"
                required
                items={data?.allCategories}
            />
        </div>

        <!-- Media & Summaries -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputComp
                {form}
                {errors}
                type="file"
                name="image"
                label="Product Image"
                placeholder="Upload Product Image"
            />

            <InputComp
                {form}
                {errors}
                type="gallery"
                name="gallery"
                label="Product Gallery Images"
                placeholder="Upload Product Gallery Images"
                bind:images
            />
        </div>

        <InputComp
            {form}
            {errors}
            type="textarea"
            name="description"
            label="Product Description"
            placeholder="Brief description (max 255 chars)"
        />

        <InputComp
            {form}
            {errors}
            type="textarea"
            name="overview"
            label="Product Overview"
            placeholder="Short explanation of what it is and who it's for"
        />

        <hr class="border-muted" />
        <h3 class="text-sm font-medium text-muted-foreground">Retail & Inventory</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <InputComp
                {form}
                {errors}
                type="number"
                name="quantity"
                label="Quantity"
                placeholder="0"
                required
            />

            <InputComp
                {form}
                {errors}
                type="text"
                name="commissionAmount"
                label="Commission Amount"
                placeholder="0.00"
                required
            />

            <InputComp
                {form}
                {errors}
                type="select"
                name="supplierId"
                label="Supplier"
                placeholder="Select supplier"
                items={data?.supplierList}
            />

            <InputComp
                {form}
                {errors}
                type="number"
                name="reorderLevel"
                label="Reorder Level"
                placeholder="Notify level"
            />
        </div>

        <div class="flex items-center gap-2">
            <InputComp
                {form}
                {errors}
                type="checkbox"
                name="isFeaturedOnHome"
                label="Featured on Home Page"
            />
        </div>

        <hr class="border-muted" />
        <h3 class="text-sm font-medium text-muted-foreground">Technical Specifications</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
        </div>

        <hr class="border-muted" />
        <h3 class="text-sm font-medium text-muted-foreground">Content Blocks</h3>

        <InputComp
            {form}
            {errors}
            type="textarea"
            name="performanceFeatures"
            label="Performance Features"
            placeholder="Mechanical properties, durability, etc."
        />

        <InputComp
            {form}
            {errors}
            type="textarea"
            name="advantages"
            label="Advantages"
            placeholder="Why choose this item over alternatives?"
        />

        <InputComp
            {form}
            {errors}
            type="textarea"
            name="applications"
            label="Applications"
            placeholder="Where is this product used?"
        />

        <Button type="submit" disabled={$delayed} class="mt-4 w-full md:w-auto self-end" form="main">
            {#if $delayed}
                <LoadingBtn name="Adding Product" />
            {:else}
                <Plus class="h-4 w-4 mr-2" />
                Add Product
            {/if}
        </Button>
    </form>
</FormCard>