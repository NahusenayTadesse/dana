<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { ChevronUp, ChevronDown, Trash2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import type { FaqTableRow } from './types';

	// Reordering and deleting for one row. Both are one-click, so they post
	// their own tiny forms rather than opening a sheet.
	let {
		row,
		moveData,
		deleteData,
		isFirst,
		isLast
	}: {
		row: FaqTableRow;
		moveData: SuperValidated<any>;
		deleteData: SuperValidated<any>;
		isFirst: boolean;
		isLast: boolean;
	} = $props();

	const { form: moveForm, enhance: moveEnhance, message: moveMessage } = untrack(() =>
		superForm(moveData, { resetForm: false, dataType: 'json', id: `faq-move-${row.id}` })
	);

	const { form: delForm, enhance: delEnhance, message: delMessage } = untrack(() =>
		superForm(deleteData, { resetForm: false, dataType: 'json', id: `faq-del-${row.id}` })
	);

	untrack(() => {
		$moveForm.id = row.id;
		$moveForm.direction = 'up';
		$delForm.id = row.id;
	});

	let confirming = $state(false);

	$effect(() => {
		const msg = $moveMessage ?? $delMessage;
		if (!msg) return;
		if (msg.type === 'error') toast.error(msg.text);
		else toast.success(msg.text);
	});
</script>

<div class="flex items-center gap-1">
	<form action="?/move" method="post" use:moveEnhance id="move-{row.id}">
		<input type="hidden" name="id" value={row.id} />
		<Button
			type="submit"
			variant="ghost"
			size="icon"
			disabled={isFirst}
			title="Move up"
			onclick={() => ($moveForm.direction = 'up')}
		>
			<ChevronUp class="h-4 w-4" />
		</Button>
		<Button
			type="submit"
			variant="ghost"
			size="icon"
			disabled={isLast}
			title="Move down"
			onclick={() => ($moveForm.direction = 'down')}
		>
			<ChevronDown class="h-4 w-4" />
		</Button>
	</form>

	<form action="?/remove" method="post" use:delEnhance id="del-{row.id}">
		<input type="hidden" name="id" value={row.id} />
		{#if confirming}
			<Button type="submit" variant="destructive" size="sm">Remove?</Button>
		{:else}
			<Button
				type="button"
				variant="ghost"
				size="icon"
				title="Remove"
				onclick={() => (confirming = true)}
			>
				<Trash2 class="h-4 w-4 text-destructive" />
			</Button>
		{/if}
	</form>
</div>
