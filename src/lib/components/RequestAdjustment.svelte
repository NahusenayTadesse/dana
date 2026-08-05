<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, MessageSquareWarning } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import type { SuperValidated } from 'sveltekit-superforms';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';

	let {
		data,
		orderId
	}: {
		data: SuperValidated<Record<string, unknown>>;
		orderId: number;
	} = $props();

	const { form, errors, enhance, delayed, message } = superForm(data, {
		id: `request-adjustment-${orderId}`,
		resetForm: true
	});
	$form.orderId = orderId;

	$effect(() => {
		if ($message) $message.type === 'error' ? toast.error($message.text) : toast.success($message.text);
	});
</script>

<DialogComp title="Request an Adjustment" variant="outline" IconComp={MessageSquareWarning} size="sm">
	<div class="flex flex-col gap-3 pt-4">
		<p class="text-sm text-muted-foreground">
			Something wrong with order #{orderId}? Let us know and our team will review it.
		</p>
		<form method="post" action="/account/history?/requestAdjustment" use:enhance class="flex flex-col gap-3">
			<input type="hidden" name="orderId" bind:value={$form.orderId} />
			<InputComp {form} {errors} type="number" name="amount" label="Amount you believe you're owed (ETB)" placeholder="0.00" />
			<InputComp {form} {errors} type="textarea" name="reason" label="What happened?" placeholder="Describe the issue" />
			<Button type="submit" disabled={$delayed}>
				{#if $delayed}
					<LoadingBtn name="Sending" />
				{:else}
					<Save class="mr-2 h-4 w-4" /> Send Request
				{/if}
			</Button>
		</form>
	</div>
</DialogComp>
