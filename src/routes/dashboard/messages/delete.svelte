<script lang="ts">
	import { untrack } from 'svelte';
	import { Button, buttonVariants } from '$lib/components/ui/button/index.js';
	import { Trash } from '@lucide/svelte';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { ScrollArea } from '$lib/components/ui/scroll-area/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { DeleteMessage as schema } from './schema';
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

	// Per-row id: with a shared one, superforms wrote a submission's result into
	// the first mounted Delete form (and the Read form, whose schema is identical),
	// so deleting one row could delete another.
	const { form, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { id: `message-delete-${id}`, resetForm: false })
	);

	untrack(() => {
		$form.id = id;
	});

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
				open = false;
			}
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
			<h5 class="text-center">Are you sure you want to delete this message? This can't be undone.</h5>
			<div class="flex flex-row items-end justify-center gap-4 pt-4">
				<form method="post" {action} use:enhance>
					<Errors allErrors={$allErrors} />
					<input bind:value={$form.id} name="id" type="hidden" />
					<Button type="submit" class="mt-4">
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
