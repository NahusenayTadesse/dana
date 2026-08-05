<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Send } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';

	import type { sendOffer } from './schema';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import RichTextEditor from '$lib/formComponents/RichTextEditor.svelte';

	let {
		data,
		priceOfferId,
		revision
	}: {
		data: SuperValidated<Infer<typeof sendOffer>>;
		priceOfferId: number;
		revision: number;
	} = $props();

	const { form, errors, enhance, delayed, message } = superForm(data, {
		id: `send-offer-${priceOfferId}`,
		resetForm: false
	});

	$form.priceOfferId = priceOfferId;
	$form.subject = `Your quote — revision ${revision}`;

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else toast.success($message.text);
		}
	});
</script>

<DialogComp title="Send Offer to Customer" variant="default" IconComp={Send}>
	<div class="flex flex-col gap-3 pt-4">
		<form method="post" action="?/sendOffer" use:enhance class="flex flex-col gap-3">
			<input type="hidden" name="priceOfferId" bind:value={$form.priceOfferId} />

			<InputComp {form} {errors} type="text" name="subject" label="Subject" placeholder="Your quote" />

			<div>
				<span class="mb-1 block text-sm font-medium">Message</span>
				<RichTextEditor bind:value={$form.message} />
				<InputComp {form} {errors} name="message" label="" type="hidden" />
			</div>

			<Button type="submit" class="mt-1 w-full">
				{#if $delayed}
					<LoadingBtn name="Sending..." />
				{:else}
					<Send class="size-4" /> Send Priced Offer
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
