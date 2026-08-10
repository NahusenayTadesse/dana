<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { ReplySchema as schema } from './schema';
	import type { SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { Send, Reply as ReplyIcon, MessageSquareText, TagIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import RichTextEditor from '$lib/formComponents/RichTextEditor.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	type ReplyRecord = {
		id: number;
		subject: string;
		message: string;
		createdAt: string | Date;
	};

	let {
		data,
		id,
		name,
		email,
		productLabel,
		replies = []
	}: {
		data: SuperValidated<schema>;
		id: number;
		name?: string;
		email?: string;
		productLabel?: string;
		replies?: ReplyRecord[];
	} = $props();

	const { form, enhance, errors, delayed, message, allErrors } = superForm(data, {
		resetForm: false
	});

	$effect(() => {
		if ($message) {
			$message.type === 'error' ? toast.error($message.text) : toast.success($message.text);
		}
	});

	$form.quoteRequestId = id;

	const formatDate = (d: string | Date) =>
		new Date(d).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<DialogComp variant="default" title="Reply to Quote Request" IconComp={ReplyIcon}>
	<div class="flex max-h-[75vh] flex-col gap-5 overflow-y-auto pr-1">
		{#if productLabel}
			<div class="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
				<TagIcon class="mr-1 inline size-3" />
				{productLabel}
			</div>
		{/if}

		<!-- Reply history -->
		<div>
			<h4 class="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
				<MessageSquareText class="size-3.5" />
				Reply History {replies.length ? `(${replies.length})` : ''}
			</h4>

			{#if replies.length === 0}
				<p class="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
					No replies sent yet.
				</p>
			{:else}
				<div class="flex flex-col gap-2">
					{#each replies as r (r.id)}
						<div class="rounded-lg border bg-card/50 p-3 text-sm">
							<div class="flex items-center justify-between gap-2">
								<span class="font-semibold">{r.subject}</span>
								<span class="text-[11px] text-muted-foreground">{formatDate(r.createdAt)}</span>
							</div>
							<p class="mt-1 line-clamp-3 text-xs text-muted-foreground">
								{@html r.message}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- New reply form -->
		<form method="post" id="reply-{id}" action="?/reply" use:enhance class="flex flex-col gap-3 border-t pt-4">
			<Errors allErrors={$allErrors} />

			<InputComp {form} {errors} name="subject" label="Subject" type="text" placeholder="Re: Your quote request" />

			<div>
				<span class="mb-1 block text-sm font-medium">Message</span>

				<RichTextEditor bind:value={$form.message} />
				<InputComp {form} {errors} name="message" label="" type="hidden" />
			</div>

			<input type="hidden" name="quoteRequestId" bind:value={$form.quoteRequestId} />

			<Button type="submit" class="mt-1 w-full" form="reply-{id}">
				{#if $delayed}
					<LoadingBtn name="Sending..." />
				{:else}
					<Send class="size-4" /> Send
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>