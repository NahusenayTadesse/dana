<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { DecideOrder as schema } from './schema';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { CircleCheckBig, CircleX } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let {
		data,
		orderId,
		requestStatus
	}: {
		data: SuperValidated<Infer<schema>>;
		orderId: number;
		requestStatus: string | null;
	} = $props();

	const {
		form: approveForm,
		enhance: approveEnhance,
		delayed: approveDelayed,
		message: approveMessage
	} = superForm(data, { id: `approve-${orderId}`, resetForm: false });

	const {
		form: rejectForm,
		enhance: rejectEnhance,
		delayed: rejectDelayed,
		message: rejectMessage
	} = superForm(data, { id: `reject-${orderId}`, resetForm: false });

	$effect(() => {
		if ($approveMessage) {
			$approveMessage.type === 'error' ? toast.error($approveMessage.text) : toast.success($approveMessage.text);
		}
	});
	$effect(() => {
		if ($rejectMessage) {
			$rejectMessage.type === 'error' ? toast.error($rejectMessage.text) : toast.success($rejectMessage.text);
		}
	});

	$approveForm.orderId = orderId;
	$rejectForm.orderId = orderId;
</script>

{#if requestStatus === 'approved'}
	<span class="text-sm font-medium text-primary">Approved — in the build queue</span>
{:else if requestStatus === 'rejected'}
	<span class="text-sm font-medium text-destructive">Rejected</span>
{:else}
	<div class="flex items-center gap-2">
		<form method="post" action="?/approveOrder" use:approveEnhance>
			<input bind:value={$approveForm.orderId} name="orderId" type="hidden" />
			<Button type="submit" size="sm" variant="default">
				{#if $approveDelayed}
					<LoadingBtn name="Approving..." />
				{:else}
					<CircleCheckBig class="size-3.5" /> Approve Order
				{/if}
			</Button>
		</form>
		<form method="post" action="?/rejectOrder" use:rejectEnhance>
			<input bind:value={$rejectForm.orderId} name="orderId" type="hidden" />
			<Button type="submit" size="sm" variant="destructive">
				{#if $rejectDelayed}
					<LoadingBtn name="Rejecting..." />
				{:else}
					<CircleX class="size-3.5" /> Reject Order
				{/if}
			</Button>
		</form>
	</div>
{/if}
