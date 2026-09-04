<script lang="ts" generics="TData, TValue">
	import {
		type ColumnDef,
		getCoreRowModel,
		getPaginationRowModel,
		type ColumnFilter,
		ColumnFiltering,
		getSortedRowModel,
		type RowSelectionState,
		getFilteredRowModel,
		type PaginationState,
		type SortingState,
		type ColumnFiltersState,
		type VisibilityState,
		type GlobalFilterColumn
	} from '@tanstack/table-core';
	import Pdf from './pdf.svelte';

	import { Input } from '$lib/components/ui/input/index.js';

	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';

	let {
		data,
		columns,
		search = true,
		class: className = '',
		fileName = 'File',
		selected = $bindable(),
		serverPaginated = false
	}: DataTableProps<TData, TValue> = $props();
	// let filterSchema = $derived(
	//   discoverFilterSchema(data).filter(meta => !filterBlacklist.includes(meta.key))
	// );  import { Input } from "$lib/components/ui/input/index.js";

	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { ChevronDownIcon, Frown, ListOrdered } from '@lucide/svelte';
	import * as Resizable from '$lib/components/ui/resizable/index.js';
	import ResizableHandle from '../ui/resizable/resizable-handle.svelte';
	import { IsMobile } from '$lib/hooks/is-mobile.svelte';
	import * as m from '$lib/paraglide/messages.js';

	// Reactive: the old isMobile() was a one-shot innerWidth read that returned
	// false on the server and never updated, so a phone rendered the desktop
	// branch — an empty second pane taking half the width beside the table — and
	// rotating the device changed nothing.
	const isMobile = new IsMobile();

	// Default is "everything on one page", which is what every call site expects.
	// It has to be resynced rather than captured once: `data` is a prop, and a
	// table that mounted against an empty array (an awaited load, a filter that
	// briefly matches nothing) would otherwise keep pageSize 0 and render no
	// rows at all once the data arrived. Server-paginated callers
	// (OrderHistoryTable) hand over a new slice per page for the same reason.
	const DEFAULT_PAGE_SIZE = 25;

	// The initial read is deliberate, not a missed reactive dependency: effects
	// don't run during SSR, so seeding from the first `data` is what keeps the
	// server-rendered row count equal to the hydrated one. The $effect below
	// owns every change after that.
	// svelte-ignore state_referenced_locally
	let pagination = $state<PaginationState>({
		pageIndex: 0,
		pageSize: data.length || DEFAULT_PAGE_SIZE
	});

	// Compared against, rather than resetting unconditionally, so a page size the
	// user picked from the "Pages" menu survives re-renders — only a genuine
	// change in the data resets it.
	// svelte-ignore state_referenced_locally
	let lastDataLength = data.length;
	$effect(() => {
		if (data.length === lastDataLength) return;
		lastDataLength = data.length;
		pagination = { pageIndex: 0, pageSize: data.length || DEFAULT_PAGE_SIZE };
	});

	let columnFilters = $state<ColumnFiltersState>([]);

	type DataTableProps<TData, TValue> = {
		columns: ColumnDef<TData, TValue>[];
		data: TData[];
		search?: boolean;
		class?: string;
		fileName?: string;
		selected?: TData[];
		/**
		 * The caller owns pagination and is handing over one page at a time.
		 * Suppresses the row-count badge, the page-size menu and this table's own
		 * pager — all three describe the slice, not the result set, and sitting
		 * them next to the caller's "Showing 11–20 of 63" reads as a contradiction.
		 */
		serverPaginated?: boolean;
	};

	let sorting = $state<SortingState>([]);
	let globalFilter = $state<GlobalFilterColumn>();

	let columnVisibility = $state<VisibilityState>({});
	let rowSelection = $state<RowSelectionState>({});

	const table = createSvelteTable({
		get data() {
			return data;
		},
		columns,
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnFilters() {
				return columnFilters;
			},
			get columnVisibility() {
				return columnVisibility;
			},

			get globalFilter() {
				return globalFilter;
			},
			get rowSelection() {
				return rowSelection;
			}
		},
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		},

		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	});

	// $props.id() rather than Math.random(): the latter produced a different id on
	// the server than on the client, so the rendered attribute mismatched on
	// hydration and Pdf's `document.querySelector('#…')` could come back null,
	// silently no-opping both Print and CSV export.
	// Must be a bare declaration initializer — Svelte rejects $props.id() nested
	// in an expression — so the prefix is applied on the next line.
	const instanceId = $props.id();
	const uniqueTableId = `table-${instanceId}`;

	function getTableBreakpoints<T>(data: T[]): number[] {
		const totalItems = data.length;
		const step = 10;
		const breakpoints: number[] = [];

		for (let i = step; i < totalItems; i += step) {
			breakpoints.push(i);
		}

		if (totalItems > 0) {
			breakpoints.push(totalItems);
		}

		return breakpoints;
	}
	if (selected) {
		$effect(() => {
			const selectedRows = table.getSelectedRowModel().rows;

			// Extract the original data from those rows
			selected = selectedRows.map((row) => row.original);
		});
	}

	// How much room is left below the table is only knowable at runtime — the
	// wrapper sits at a different offset on every dashboard route — so a fixed
	// or guessed-viewport cap either wastes screen or overflows it. Measure the
	// wrapper's top instead and cap to the remainder; the class fallback on the
	// wrapper covers SSR and the first frame before this runs.
	const MIN_TABLE_HEIGHT = 320;
	const BOTTOM_GUTTER = 16;

	let tableShell: HTMLElement | null = $state(null);
	let availableHeight = $state(0);

	$effect(() => {
		const shell = tableShell;
		if (!shell) return;

		// Deliberately not recomputed on scroll: the wrapper's top moves with the
		// page, and resizing the table mid-scroll would make it jump under the
		// cursor.
		const measure = () => {
			const top = shell.getBoundingClientRect().top;
			const remaining = window.innerHeight - top - BOTTOM_GUTTER;
			availableHeight = Math.min(
				window.innerHeight - BOTTOM_GUTTER,
				Math.max(MIN_TABLE_HEIGHT, remaining)
			);
		};

		measure();
		// Body observer catches layout shifts above the table (filters wrapping,
		// sidebar toggles); the resize listener catches viewport height changes,
		// which leave the body's own box untouched.
		const observer = new ResizeObserver(measure);
		observer.observe(document.body);
		window.addEventListener('resize', measure);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', measure);
		};
	});
</script>

<!-- min-h-0 is required for flex-child overflow -->
<!-- <div class="flex-1 text-sm text-muted-foreground">
	{table.getFilteredSelectedRowModel().rows.length} of{''}
	{table.getFilteredRowModel().rows.length} row(s) selected.

	{#each table.getFilteredRowModel().rows as selected}
		{selected?.id}
	{/each}
</div> -->
<Resizable.PaneGroup
	direction="horizontal"
	class="mt-4 flex w-full min-w-full gap-0 rounded-lg lg:w-fit lg:min-w-2xl {className}"
>
	<Resizable.Pane
		defaultSize={isMobile.current
			? 100
			: table.getAllColumns().filter((col) => col.getIsVisible()).length * 20}
		class="bg-background"
	>
		<ScrollArea orientation="vertical" class="w-full rounded-lg p-2">
			<div class="flex min-w-full flex-col gap-2 rounded-md border-0 px-1">
				
					<ScrollArea
						orientation="horizontal"
						class="flex w-full flex-row rounded-md border whitespace-nowrap"
					>
						<div
							class="flex w-full space-x-4 p-4
						"
						>
						{#if search}
							<Input
								type="search"
								placeholder={m.table_search_placeholder()}
								class="w-64 lg:w-full"
								bind:value={globalFilter}
								oninput={() => table.setGlobalFilter(globalFilter)}
							/>
							{/if}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									{#snippet child({ props })}
										<Button {...props} variant="outline" class="ml-auto"
											>{m.table_columns()} <ChevronDownIcon class="size-5" />
										</Button>
									{/snippet}
								</DropdownMenu.Trigger>
								<DropdownMenu.Content align="end">
									{#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column)}
										<DropdownMenu.CheckboxItem
											class="capitalize"
											bind:checked={
												() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)
											}
										>
											{column.id.replace(/([a-z])([A-Z])/g, '$1 $2')}
										</DropdownMenu.CheckboxItem>
									{/each}
								</DropdownMenu.Content>
							</DropdownMenu.Root>

							<!-- Both of these describe the rows this table is holding. When the
							     caller paginates server-side that is one page, not the result
							     set, and the caller shows the real totals itself. -->
							{#if !serverPaginated}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button {...props} variant="outline" class="ml-auto"
												>{m.table_pages()} <ChevronDownIcon class="size-5" />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="center" class="flex w-4! flex-col">
										{#each getTableBreakpoints(data) as column (column)}
											<DropdownMenu.Item
												class="w-4! capitalize"
												onclick={() => {
													table.setPageSize(column);
												}}
											>
												{#snippet child({ props })}
													<Button
														{...props}
														variant={pagination.pageSize === column ? 'default' : 'ghost'}
														size="icon"
														class="max-w-16"
														>{column}
													</Button>
												{/snippet}
											</DropdownMenu.Item>
										{/each}
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
							<Pdf {fileName} tableId="#{uniqueTableId}" {data} />
							{#if !serverPaginated}
								<Button variant="outline">
									<ListOrdered />
									{m.table_results({ count: table.getFilteredRowModel().rows.length })}
								</Button>
							{/if}
						</div>
					</ScrollArea>
				
				<!-- Flex column so the rows take every pixel the measured height
				     leaves over after the pagination footer, and scroll inside it. -->
				<div
					bind:this={tableShell}
					class="flex min-h-0 flex-col rounded-md border max-h-[max(20rem,calc(100dvh-16rem))]"
					style:max-height={availableHeight ? `${availableHeight}px` : undefined}
				>
					<!-- The scroll box is the container, not the <table>: a table box
					     ignores max-height, so a cap on Table.Root's `class` (which lands
					     on the <table>) does nothing and long tables render at full
					     height regardless. -->
					<Table.Root id={uniqueTableId} containerClass="min-h-0 flex-1">
						<Table.Header class="sticky top-0 z-30 bg-background">
							{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
								<Table.Row>
									{#each headerGroup.headers as header, index}
										<!-- Pin the leftmost column, not the one beside it: pinning
										     index 1 let column 0 slide underneath its opaque
										     background on horizontal scroll. -->
										<Table.Head
											colspan={header.colSpan}
											class="{index === 0
												? 'sticky left-0 z-20 bg-background'
												: ''} p-0 px-2 text-start"
										>
											{#if !header.isPlaceholder}
												<FlexRender
													content={header.column.columnDef.header}
													context={header.getContext()}
												/>
											{/if}
										</Table.Head>
									{/each}
								</Table.Row>
							{/each}
						</Table.Header>
						<Table.Body>
							{#each table.getRowModel().rows as row (row.id)}
								<Table.Row data-state={row.getIsSelected() && 'selected'}>
									{#each row.getVisibleCells() as cell, index}
										<Table.Cell
											class="word-break capitalize {index === 0
												? 'sticky left-0 z-10 bg-background'
												: ''}"
										>
											<FlexRender
												content={cell.column.columnDef.cell}
												context={cell.getContext()}
											/>
										</Table.Cell>
									{/each}
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={columns.length} class="text-center font-2xl">
										<div class="flex flex-row items-center justify-center gap-2">
											<Frown class="animate-bounce" />
											{m.table_empty()}
										</div>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>

					<!-- In normal flow, not absolutely positioned: the wrapper isn't a
					     containing block, so `absolute -bottom-5` sent these buttons to
					     the bottom of the viewport instead of under the table. -->
					{#if table.getPageCount() > 1}
						<div class="flex shrink-0 items-center justify-end gap-2 border-t px-2 py-2">
							<span class="mr-auto text-xs text-muted-foreground">
								{m.table_page_of({
									page: pagination.pageIndex + 1,
									total: table.getPageCount()
								})}
							</span>
							<Button
								variant="outline"
								size="sm"
								onclick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								{m.table_previous()}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onclick={() => table.nextPage()}
								disabled={!table.getCanNextPage()}
							>
								{m.table_next()}
							</Button>
						</div>
					{/if}
				</div>
			</div>
		</ScrollArea>
	</Resizable.Pane>
	<ResizableHandle withHandle />
	{#if isMobile.current}
		<Resizable.Pane defaultSize={0}></Resizable.Pane>
	{:else}
		<Resizable.Pane></Resizable.Pane>
	{/if}
</Resizable.PaneGroup>
