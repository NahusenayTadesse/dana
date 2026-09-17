<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Trash } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { DeleteService as schema } from './schema';

	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';

	let {
		data,
		action = '?/delete',
		id
	}: {
		data: SuperValidated<schema>;
		action?: string;
		id: number;
	} = $props();

	let open = $state(false);

	// Per-row id: with a shared one, deleting could target another row.
	const { form, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, id: `blog-category-delete-${id}` })
	);

	untrack(() => {
		$form.id = id;
	});

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') {
			toast.error($message.text);
		} else {
			toast.success($message.text);
			open = false;
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={buttonVariants({ variant: 'destructive' })}><Trash /></Dialog.Trigger>
	<Dialog.Content class="w-full">
		<Dialog.Header>
			<Dialog.Title>Delete</Dialog.Title>
		</Dialog.Header>
		<ScrollArea class="h-auto rounded-md border p-2">
			<h5 class="text-center">Are you sure you want to Delete? This action is irreversible</h5>
			<div class="flex flex-row items-end justify-center gap-4 pt-4">
				<form method="post" id="blog-category-delete-{id}" {action} use:enhance>
					<Errors allErrors={$allErrors} />
					<input value={$form.id} name="id" type="hidden" />
					<Button type="submit" class="mt-4" form="blog-category-delete-{id}">
						{#if $delayed}
							<LoadingBtn name="Deleting" />
						{:else}
							<Trash /> Delete
						{/if}
					</Button>
				</form>

				<Button onclick={() => (open = false)} class="mt-4">Cancel</Button>
			</div>
		</ScrollArea>
	</Dialog.Content>
</Dialog.Root>
