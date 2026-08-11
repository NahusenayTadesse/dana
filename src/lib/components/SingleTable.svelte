<script lang="ts">
	import { LoaderCircle } from '@lucide/svelte';
	import DataTable from './Table/data-table.svelte';
	import { singleColumns, type SingleRow } from './Table/single-columns';
	import * as m from '$lib/paraglide/messages.js';

	let {
		singleTable,
		fileName = 'details'
	}: { singleTable: SingleRow[]; fileName?: string } = $props();
</script>

{#await singleTable}
	<h1 class="m-2 flex flex-row">
		{m.common_loading()}
		<LoaderCircle class="animate-spin" />
	</h1>
{:then rows}
	<DataTable data={rows} columns={singleColumns} search={false} {fileName} />
{/await}
