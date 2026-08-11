<script lang="ts">
	import { Button } from '$lib/components/ui/button/index';
	import { Printer, Download, Grid3x3 } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index';
	import { page } from '$app/state';
	import { downloadCSV, printElement, tableToRows } from '$lib/print';
	import * as m from '$lib/paraglide/messages.js';

	const {
		fileName = page.url.pathname.split('/').pop() || 'export',
		tableId,
		data,
		title = ''
	}: { fileName?: string; tableId?: string; data?: any; title?: string } = $props();

	function prettify(name: string) {
		return name.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
	}

	/**
	 * Print-to-PDF: hands the live table to the browser's print dialog, where
	 * "Save as PDF" produces a faithful copy of what's on screen. Replaces the
	 * old jsPDF/autoTable path, which flattened images and styling away.
	 */
	function printToPdf() {
		if (!tableId) return;
		printElement(tableId, { fileName, title: title || prettify(fileName) });
	}

	function exportTableToCSV() {
		const rows = tableId ? tableToRows(tableId) : data;
		if (!rows || rows.length === 0) {
			console.error(`Nothing to export for ${tableId ?? 'the supplied data'}.`);
			return;
		}
		downloadCSV(rows, fileName);
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" class="ml-auto">
				<Download class="size-5" />
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content class="flex w-auto flex-col gap-2 p-2">
		<DropdownMenu.Item class="capitalize">
			{#snippet child({ props })}
				<Button {...props} variant="default" onclick={printToPdf}>
					<Printer class="size-4 text-white dark:text-black" />
					{m.receipt_save_pdf()}
				</Button>
			{/snippet}
		</DropdownMenu.Item>
		<DropdownMenu.Item class="capitalize">
			{#snippet child({ props })}
				<Button {...props} variant="default" onclick={exportTableToCSV}>
					<Grid3x3 class="size-4 text-white dark:text-black" />
					{m.receipt_export_csv()}
				</Button>
			{/snippet}
		</DropdownMenu.Item>
	</DropdownMenu.Content>
</DropdownMenu.Root>
