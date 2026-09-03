<script lang="ts">
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Images, ExternalLink } from '@lucide/svelte';
	import SlotPreview from './slot-preview.svelte';
	import ManageSlot from './manage-slot.svelte';
	import SlotStatus from './slot-status.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import type { SlotRow } from './types';

	let { data } = $props();

	const slots = $derived(data.slots as SlotRow[]);
	const customised = $derived(slots.filter((slot) => slot.isCustom).length);

	// `sortable` isn't part of ColumnDef — sorting is on by default and the
	// header component drives it, so the columns are plain tanstack defs.
	const columns: ColumnDef<SlotRow, unknown>[] = [
		{
			accessorKey: 'index',
			header: '#',
			cell: (info) => info.row.index + 1
		},
		{
			accessorKey: 'values',
			header: 'Preview',
			cell: ({ row }) =>
				renderComponent(SlotPreview, {
					values: row.original.values,
					label: row.original.label
				})
		},
		{
			accessorKey: 'label',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Image',
					onclick: column.getToggleSortingHandler()
				}),
			cell: ({ row }) =>
				renderComponent(ManageSlot, {
					slot: row.original,
					updateForm: data.updateForm,
					resetForm: data.resetForm,
					trigger: 'label'
				})
		},
		{
			accessorKey: 'description',
			header: 'What it is',
			cell: ({ row }) => row.original.description
		},
		{
			accessorKey: 'section',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Page',
					onclick: column.getToggleSortingHandler()
				})
		},
		{
			accessorKey: 'kind',
			header: 'Type',
			cell: ({ row }) =>
				row.original.kind === 'single'
					? 'Single image'
					: `Gallery · ${row.original.values.length}${
							row.original.maxCount ? ` of ${row.original.maxCount}` : ''
						}`
		},
		{
			accessorKey: 'isCustom',
			header: 'Status',
			cell: ({ row }) => renderComponent(SlotStatus, { isCustom: row.original.isCustom })
		},
		{
			accessorKey: 'manage',
			header: 'Manage',
			cell: ({ row }) =>
				renderComponent(ManageSlot, {
					slot: row.original,
					updateForm: data.updateForm,
					resetForm: data.resetForm,
					trigger: 'button'
				})
		}
	];
</script>

<svelte:head>
	<title>Site Images</title>
</svelte:head>

<main class="container mx-auto w-full! space-y-6 p-4">
	<div class="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
		<div>
			<h1 class="flex items-center gap-2 text-3xl font-bold tracking-tight">
				<Images class="size-7 text-primary" /> Site Images
			</h1>
			<p class="mt-1 max-w-2xl text-muted-foreground">
				Every photo and logo on the public website. Replace one here and it changes on the live site
				straight away — no code deploy. Slots you haven't touched keep showing the image the site
				shipped with.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Badge variant="secondary" class="text-sm">{slots.length} image slots</Badge>
			<Badge variant={customised ? 'default' : 'outline'} class="text-sm">
				{customised} customised
			</Badge>
		</div>
	</div>

	<div class="flex flex-wrap gap-2 text-sm text-muted-foreground">
		<span class="font-medium text-foreground">Jump to a page:</span>
		{#each ['/', '/about', '/factory'] as href (href)}
			<a
				{href}
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-1 rounded-full border px-3 py-0.5 hover:border-primary hover:text-primary"
			>
				{href === '/' ? 'Home' : href.replace('/', '')}
				<ExternalLink class="size-3" />
			</a>
		{/each}
	</div>

	{#key slots}
		<DataTable {columns} data={slots} search={true} fileName="site-images" />
	{/key}
</main>
