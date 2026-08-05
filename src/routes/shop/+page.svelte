<script lang="ts">
    import ProductCard from '$lib/components/product-card.svelte';
    import { Input } from '$lib/components/ui/input';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Button } from '$lib/components/ui/button';
    import {
        SearchIcon,
        XIcon,
        ChevronLeft,
        ChevronRight,
        FilterIcon,
        X,
        SlidersHorizontal,
        Layers,
        Paintbrush,
        Ruler,
        CheckCircle2,
        Move,
        Layers3,
        Tag
    } from '@lucide/svelte';
    import Label from '$lib/components/ui/label/label.svelte';
    import { goto } from '$app/navigation';
    import { page as sveltePage } from '$app/state';
    import { toast } from 'svelte-sonner';
    import { isMobile } from '$lib/global.svelte.js';
    import { fly } from 'svelte/transition';
    import * as m from '$lib/paraglide/messages.js';
    // color-name.ts is no longer needed — colors now come straight from the DB with real name + hex

    let { data } = $props();

    let searchQuery = $state(sveltePage.url.searchParams.get('search') ?? '');

    // Thickness bounds now come from the DB (real mm range) instead of a guessed hardcode
    const THICKNESS_MIN = $derived(data?.thicknessBounds?.min ?? 0);
    const THICKNESS_MAX = $derived(data?.thicknessBounds?.max ?? 5);

    let minThick = $state(
        Number(sveltePage.url.searchParams.get('minThick')) || THICKNESS_MIN
    );
    let maxThick = $state(
        Number(sveltePage.url.searchParams.get('maxThick')) || THICKNESS_MAX
    );

    let selectedColorIds = $state(
        sveltePage.url.searchParams.get('colors')?.split(',').filter(Boolean).map(Number) ?? []
    );
    let selectedWidthIds = $state(
        sveltePage.url.searchParams.get('widths')?.split(',').filter(Boolean).map(Number) ?? []
    );
    let selectedLengthIds = $state(
        sveltePage.url.searchParams.get('lengths')?.split(',').filter(Boolean).map(Number) ?? []
    );
    let isAvailableOnly = $state(sveltePage.url.searchParams.get('available') === 'true');

    let selectedCategories = $state(
        sveltePage.url.searchParams.get('categories')?.split(',').filter(Boolean).map(Number) ?? []
    );
    let selectedCoatingTypes = $state(
        sveltePage.url.searchParams.get('coatingTypes')?.split(',').filter(Boolean) ?? []
    );
    let selectedBrands = $state(
        sveltePage.url.searchParams.get('brands')?.split(',').filter(Boolean) ?? []
    );

    const hasActiveFilters = $derived(
        sveltePage.url.searchParams.toString() !== '' &&
            sveltePage.url.searchParams.toString() !== 'page=1'
    );

    const categories = $derived(data?.categoriesList ?? []);
    const availableColors = $derived(data?.colorsList ?? []);
    const availableWidths = $derived(data?.widthsList ?? []);
    const availableLengths = $derived(data?.lengthsList ?? []);
    const availableCoatingTypes = $derived(data?.coatingTypesList ?? []);
    const availableBrands = $derived(data?.brandsList ?? []);
    const isAllCategoriesSelected = $derived(selectedCategories.length === 0);

    const minPct = $derived(((minThick - THICKNESS_MIN) / (THICKNESS_MAX - THICKNESS_MIN)) * 100);
    const maxPct = $derived(((maxThick - THICKNESS_MIN) / (THICKNESS_MAX - THICKNESS_MIN)) * 100);

    function updateFilters(newParams: Record<string, string | number | boolean | undefined>) {
        const newUrl = new URL(sveltePage.url);
        for (const [key, value] of Object.entries(newParams)) {
            if (value !== undefined && value !== '' && value !== false && value !== 0) {
                newUrl.searchParams.set(key, value.toString());
            } else {
                newUrl.searchParams.delete(key);
            }
        }
        if (!newParams.page) newUrl.searchParams.set('page', '1');
        goto(newUrl, { keepFocus: true, noScroll: true });
    }

    function handleSearch() {
        updateFilters({ search: searchQuery });
    }

    function handleMinThickInput(e: Event) {
        const val = Number((e.target as HTMLInputElement).value);
        minThick = Math.min(val, maxThick - 0.01);
    }

    function handleMaxThickInput(e: Event) {
        const val = Number((e.target as HTMLInputElement).value);
        maxThick = Math.max(val, minThick + 0.01);
    }

    function applyThicknessFilter() {
        toast.success(m.shop_price_bounds_applied());
        updateFilters({
            minThick: minThick !== THICKNESS_MIN ? minThick : undefined,
            maxThick: maxThick !== THICKNESS_MAX ? maxThick : undefined,
            page: 1
        });
    }

    function toggleCategoryFilter(id: number) {
        selectedCategories = selectedCategories.includes(id)
            ? selectedCategories.filter((c) => c !== id)
            : [...selectedCategories, id];

        updateFilters({
            categories: selectedCategories.length > 0 ? selectedCategories.join(',') : undefined,
            page: 1
        });
    }

    function toggleColorFilter(id: number) {
        selectedColorIds = selectedColorIds.includes(id)
            ? selectedColorIds.filter((c) => c !== id)
            : [...selectedColorIds, id];
        updateFilters({
            colors: selectedColorIds.length > 0 ? selectedColorIds.join(',') : undefined,
            page: 1
        });
    }

    function toggleWidthFilter(id: number) {
        selectedWidthIds = selectedWidthIds.includes(id)
            ? selectedWidthIds.filter((w) => w !== id)
            : [...selectedWidthIds, id];
        updateFilters({
            widths: selectedWidthIds.length > 0 ? selectedWidthIds.join(',') : undefined,
            page: 1
        });
    }

    function toggleLengthFilter(id: number) {
        selectedLengthIds = selectedLengthIds.includes(id)
            ? selectedLengthIds.filter((l) => l !== id)
            : [...selectedLengthIds, id];
        updateFilters({
            lengths: selectedLengthIds.length > 0 ? selectedLengthIds.join(',') : undefined,
            page: 1
        });
    }

    function toggleCoatingTypeFilter(value: string) {
        selectedCoatingTypes = selectedCoatingTypes.includes(value)
            ? selectedCoatingTypes.filter((c) => c !== value)
            : [...selectedCoatingTypes, value];
        updateFilters({
            coatingTypes: selectedCoatingTypes.length > 0 ? selectedCoatingTypes.join(',') : undefined,
            page: 1
        });
    }

    function toggleBrandFilter(value: string) {
        selectedBrands = selectedBrands.includes(value)
            ? selectedBrands.filter((b) => b !== value)
            : [...selectedBrands, value];
        updateFilters({
            brands: selectedBrands.length > 0 ? selectedBrands.join(',') : undefined,
            page: 1
        });
    }

    function handleAvailabilityChange(checked: boolean) {
        isAvailableOnly = checked;
        updateFilters({ available: isAvailableOnly || undefined, page: 1 });
    }

    function clearCategories() {
        selectedCategories = [];
        updateFilters({ categories: undefined, page: 1 });
    }

    function resetFilters() {
        searchQuery = '';
        minThick = THICKNESS_MIN;
        maxThick = THICKNESS_MAX;
        selectedColorIds = [];
        selectedWidthIds = [];
        selectedLengthIds = [];
        isAvailableOnly = false;
        selectedCategories = [];
        selectedCoatingTypes = [];
        selectedBrands = [];
        goto(sveltePage.url.pathname);
    }

    const goToPage = (p: number) => updateFilters({ page: p });
    const mobile = isMobile();
    let showFilter = $state(mobile ? false : true);
    const Icon = $derived(showFilter ? X : SlidersHorizontal);

    function widthLabel(w: { value: string; unit: string; label: string | null }) {
        return w.label || `${w.value}${w.unit}`;
    }

    function lengthLabel(l: { value: string; unit: string; label: string | null; isCustom: boolean | null }) {
        const base = l.label || `${l.value}${l.unit}`;
        return l.isCustom ? `${base} (cut to order)` : base;
    }
</script>

<svelte:head>
    <title>{m.shop_meta_title()}</title>
    <meta name="description" content={m.shop_meta_description()} />
</svelte:head>

<div class="min-h-screen antialiased transition-colors duration-300">
    <header class="sticky top-0 z-40 border-b border-border/80 bg-background/75 shadow-xs backdrop-blur-md">
        <div class="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
            <div class="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 class="bg-linear-to-r from-foreground to-foreground/80 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-3xl">
                        {m.shop_heading()}
                    </h1>
                    <p class="mt-1 text-xs text-muted-foreground sm:text-sm">
                        Total items: {data?.pagination?.totalCount ?? 0}
                    </p>
                </div>

                {#if hasActiveFilters}
                    <Button
                        variant="ghost"
                        size="sm"
                        onclick={resetFilters}
                        class="h-8 self-start rounded-lg border border-destructive/20 text-xs text-destructive transition-all hover:bg-destructive/10 sm:self-center"
                    >
                        <XIcon size={12} class="mr-1.5" />
                        Clear Filter Specifications
                    </Button>
                {/if}
            </div>

            <div class="relative">
                <SearchIcon class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground/80" />
                <Input
                    type="text"
                    placeholder={m.shop_search_placeholder()}
                    bind:value={searchQuery}
                    oninput={handleSearch}
                    class="h-10 rounded-xl border-border bg-card/50 pl-10 shadow-inner focus-visible:border-primary focus-visible:ring-primary/20"
                />
            </div>
        </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {#if mobile}
                <Button onclick={() => (showFilter = !showFilter)} class="w-40 mb-4">
                    <Icon class="size-4 mr-2" />
                    <span class="text-sm font-bold tracking-wider uppercase">{m.shop_filter_button()}</span>
                </Button>
            {/if}

            {#if showFilter}
                <aside class="lg:col-span-1" transition:fly={{ x: -200, duration: 200 }}>
                    <div class="sticky top-32 space-y-6 rounded-2xl border border-border/80 bg-card/40 p-5 shadow-sm backdrop-blur-lg">
                        <div class="flex items-center gap-2 border-b border-border/60 pb-3">
                            <SlidersHorizontal class="size-4 text-primary" />
                            <h3 class="text-sm font-bold tracking-wider text-foreground uppercase">
                                Specifications Filter
                            </h3>
                        </div>

                        <!-- Thickness Range Slider (mm only — see caveat below) -->
                        <div class="space-y-3 border-b border-border/60 pb-4">
                            <div class="flex items-center justify-between">
                                <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Thickness Bounds (mm)
                                </h4>
                                <span class="font-mono text-xs text-foreground/80">
                                    {minThick}&nbsp;–&nbsp;{maxThick}&nbsp;mm
                                </span>
                            </div>

                            <div class="relative h-5 select-none">
                                <div class="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-muted"></div>
                                <div
                                    class="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-primary"
                                    style:left="{minPct}%"
                                    style:right="{100 - maxPct}%"
                                ></div>

                                <input
                                    type="range"
                                    min={THICKNESS_MIN}
                                    max={THICKNESS_MAX}
                                    step="0.01"
                                    value={minThick}
                                    oninput={handleMinThickInput}
                                    onchange={applyThicknessFilter}
                                    class="range-thumb pointer-events-none absolute top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent"
                                    aria-label="Minimum thickness"
                                />
                                <input
                                    type="range"
                                    min={THICKNESS_MIN}
                                    max={THICKNESS_MAX}
                                    step="0.01"
                                    value={maxThick}
                                    oninput={handleMaxThickInput}
                                    onchange={applyThicknessFilter}
                                    class="range-thumb pointer-events-none absolute top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent"
                                    aria-label="Maximum thickness"
                                />
                            </div>
                        </div>

                        <!-- Categories -->
                        <div class="max-h-55 scrollbar-none space-y-2.5 overflow-y-auto border-b border-border/60 pb-4">
                            <div class="flex items-center gap-2">
                                <Layers class="size-3.5 text-muted-foreground" />
                                <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Product Classifications
                                </h4>
                            </div>
                            <div class="flex items-center gap-2.5 py-0.5">
                                <Checkbox
                                    id="category-all"
                                    checked={isAllCategoriesSelected}
                                    onCheckedChange={clearCategories}
                                    class="rounded-md"
                                />
                                <Label for="category-all" class="flex-1 cursor-pointer text-sm font-medium">
                                    All Sheets & Items
                                </Label>
                            </div>
                            {#each categories as category (category.id)}
                                <div class="flex items-center gap-2.5 py-0.5">
                                    <Checkbox
                                        id={`category-${category.id}`}
                                        checked={selectedCategories.includes(category.id)}
                                        onCheckedChange={() => toggleCategoryFilter(category.id)}
                                        class="rounded-md"
                                    />
                                    <Label
                                        for={`category-${category.id}`}
                                        class="flex-1 cursor-pointer text-sm font-medium text-foreground/80"
                                    >
                                        {category.name}
                                    </Label>
                                </div>
                            {/each}
                        </div>

                        <!-- Width -->
                        <div class="max-h-55 scrollbar-none space-y-2.5 overflow-y-auto border-b border-border/60 pb-4">
                            <div class="flex items-center gap-2">
                                <Ruler class="size-3.5 text-muted-foreground" />
                                <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Width Options
                                </h4>
                            </div>
                            <div class="flex flex-wrap gap-2 pt-1">
                                {#each availableWidths as w (w.id)}
                                    {@const isSelected = selectedWidthIds.includes(w.id)}
                                    <button
                                        type="button"
                                        onclick={() => toggleWidthFilter(w.id)}
                                        class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                                        {isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                            : 'bg-card text-foreground/80 border-border hover:bg-accent'}"
                                    >
                                        {widthLabel(w)}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Length -->
                        <div class="max-h-55 scrollbar-none space-y-2.5 overflow-y-auto border-b border-border/60 pb-4">
                            <div class="flex items-center gap-2">
                                <Move class="size-3.5 text-muted-foreground" />
                                <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Length Options
                                </h4>
                            </div>
                            <div class="flex flex-wrap gap-2 pt-1">
                                {#each availableLengths as l (l.id)}
                                    {@const isSelected = selectedLengthIds.includes(l.id)}
                                    <button
                                        type="button"
                                        onclick={() => toggleLengthFilter(l.id)}
                                        class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                                        {isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                            : 'bg-card text-foreground/80 border-border hover:bg-accent'}"
                                    >
                                        {lengthLabel(l)}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Coating Type -->
                        <div class="max-h-55 scrollbar-none space-y-2.5 overflow-y-auto border-b border-border/60 pb-4">
                            <div class="flex items-center gap-2">
                                <Layers3 class="size-3.5 text-muted-foreground" />
                                <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Coating Type
                                </h4>
                            </div>
                            <div class="flex flex-wrap gap-2 pt-1">
                                {#each availableCoatingTypes as coatingType (coatingType)}
                                    {@const isSelected = selectedCoatingTypes.includes(coatingType)}
                                    <button
                                        type="button"
                                        onclick={() => toggleCoatingTypeFilter(coatingType)}
                                        class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                                        {isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                            : 'bg-card text-foreground/80 border-border hover:bg-accent'}"
                                    >
                                        {coatingType}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Brand -->
                        <div class="max-h-55 scrollbar-none space-y-2.5 overflow-y-auto border-b border-border/60 pb-4">
                            <div class="flex items-center gap-2">
                                <Tag class="size-3.5 text-muted-foreground" />
                                <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Brand
                                </h4>
                            </div>
                            <div class="flex flex-wrap gap-2 pt-1">
                                {#each availableBrands as brand (brand)}
                                    {@const isSelected = selectedBrands.includes(brand)}
                                    <button
                                        type="button"
                                        onclick={() => toggleBrandFilter(brand)}
                                        class="px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                                        {isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                            : 'bg-card text-foreground/80 border-border hover:bg-accent'}"
                                    >
                                        {brand}
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Color -->
                        <div class="max-h-60 scrollbar-none space-y-2.5 overflow-y-auto">
                            <div class="flex items-center gap-2">
                                <Paintbrush class="size-3.5 text-muted-foreground" />
                                <h4 class="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Color Profile Options
                                </h4>
                            </div>
                            <div class="flex flex-wrap gap-2 pt-1">
                                {#each availableColors as color (color.id)}
                                    {@const isSelected = selectedColorIds.includes(color.id)}
                                    <button
                                        type="button"
                                        onclick={() => toggleColorFilter(color.id)}
                                        class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150
                                        {isSelected
                                            ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                                            : 'bg-card text-foreground/80 border-border hover:bg-accent'}"
                                    >
                                        {#if color.hexValue}
                                            <span
                                                class="w-2.5 h-2.5 rounded-full border border-foreground/10 shrink-0"
                                                style:background-color={color.hexValue}
                                            ></span>
                                        {/if}
                                        <span>{color.name}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>

                        <!-- Availability -->
                        <div class="flex items-center gap-2.5 py-1">
                            <Checkbox
                                id="stock-available"
                                checked={isAvailableOnly}
                                onCheckedChange={handleAvailabilityChange}
                                class="rounded-md"
                            />
                            <CheckCircle2 class="size-3.5 text-muted-foreground" />
                            <Label for="stock-available" class="flex-1 cursor-pointer text-sm font-medium">
                                In Stock Only
                            </Label>
                        </div>
                    </div>
                </aside>
            {/if}

            <div class="space-y-8 lg:col-span-3">
                {#if !data.productList || data.productList.length === 0}
                    <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/20 py-28 text-center backdrop-blur-xs">
                        <FilterIcon class="mb-4 size-10 stroke-[1.5] text-muted-foreground/30" />
                        <h3 class="text-base font-bold tracking-tight">{m.shop_empty_title()}</h3>
                        <p class="mt-1 max-w-xs text-sm text-muted-foreground">
                            No products match your specialized specifications. Try resetting your inputs.
                        </p>
                        <Button
                            variant="outline"
                            class="mt-5 h-9 rounded-xl px-4 text-xs"
                            onclick={resetFilters}
                        >
                            Reset Spec Engine
                        </Button>
                    </div>
                {:else}
                    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {#each data.productList as product}
                            <div class="transition-all duration-300 hover:-translate-y-1">
                                <ProductCard {...product} />
                            </div>
                        {/each}
                    </div>

                    {#if data.pagination && data.pagination.totalPages > 1}
                        <div class="mt-12 flex items-center justify-center gap-1.5 border-t border-border/40 pt-6">
                            <Button
                                variant="outline"
                                size="icon"
                                class="size-8 rounded-lg border-border"
                                disabled={!data.pagination.hasPrevPage}
                                onclick={() => goToPage(data.pagination.currentPage - 1)}
                                aria-label={m.shop_previous_page()}
                            >
                                <ChevronLeft size={14} />
                            </Button>

                            {#each Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1) as p (p)}
                                {@const isCurrent = p === data.pagination.currentPage}
                                <Button
                                    variant={isCurrent ? 'default' : 'outline'}
                                    class="size-8 rounded-lg font-mono text-xs font-bold transition-all duration-200
                                    {isCurrent
                                        ? 'shadow-sm ring-2 ring-primary/10'
                                        : 'border-border text-muted-foreground hover:text-foreground'}"
                                    onclick={() => goToPage(p)}
                                >
                                    {p}
                                </Button>
                            {/each}

                            <Button
                                variant="outline"
                                size="icon"
                                class="size-8 rounded-lg border-border"
                                disabled={!data.pagination.hasNextPage}
                                onclick={() => goToPage(data.pagination.currentPage + 1)}
                                aria-label={m.shop_next_page()}
                            >
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    {/if}
                {/if}
            </div>
        </div>
    </main>
</div>

<style>
    .range-thumb::-webkit-slider-thumb {
        pointer-events: auto;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 9999px;
        background: var(--color-primary, #2563eb);
        border: 2px solid var(--color-background, white);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        cursor: pointer;
        margin-top: -6px;
    }
    .range-thumb::-moz-range-thumb {
        pointer-events: auto;
        width: 16px;
        height: 16px;
        border-radius: 9999px;
        background: var(--color-primary, #2563eb);
        border: 2px solid var(--color-background, white);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
        cursor: pointer;
    }
    .range-thumb::-webkit-slider-runnable-track {
        -webkit-appearance: none;
        background: transparent;
    }
</style>