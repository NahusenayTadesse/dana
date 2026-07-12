<script lang="ts">
	import { columns } from './columns';

	let { data } = $props();

	import DataTable from '$lib/components/Table/data-table.svelte';

	import { Frown, Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<svelte:head>
	<title>Blog List</title>
</svelte:head>

{#if data.eventList.length === 0}
	<div class="flex h-96 w-full flex-col items-center justify-center lg:w-5xl">
		<p class="justify-self-cente mt-4 flex flex-row gap-4 text-center text-4xl">
			<Frown class="h-12 w-16  animate-bounce" />
			Blog List is Empty
		</p>
		<Button href="/dashboard/blog/add-blog"><Plus />Add New Blog</Button>
	</div>
{:else}
	<h2 class="my-4 text-2xl">No of Blogs: {data.eventList?.length}</h2>

	<DataTable data={data?.eventList} {columns} fileName="Blog List" />
{/if}
