<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { CircleCheckBig, CircleX } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { superForm } from 'sveltekit-superforms';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import type { DecideAdjustment as schema } from './schema';

	let {
		data,
		adjustmentId
	}: {
		data: SuperValidated<Infer<schema>>;
		adjustmentId: number;
	} = $props();

	const {
		form: approveForm,
		enhance: approveEnhance,
		message: approveMessage
	} = superForm(data, { id: `decide-adjustment-approve-${adjustmentId}`, resetForm: false });
	const {
		form: rejectForm,
		enhance: rejectEnhance,
		message: rejectMessage
	} = superForm(data, { id: `decide-adjustment-reject-${adjustmentId}`, resetForm: false });

	$effect(() => {
		if ($approveMessage) $approveMessage.type === 'error' ? toast.error($approveMessage.text) : toast.success($approveMessage.text);
	});
	$effect(() => {
		if ($rejectMessage) $rejectMessage.type === 'error' ? toast.error($rejectMessage.text) : toast.success($rejectMessage.text);
	});

	$approveForm.adjustmentId = adjustmentId;
	$approveForm.approve = true;
	$rejectForm.adjustmentId = adjustmentId;
	$rejectForm.approve = false;
</script>

<div class="flex gap-1.5">
	<form method="post" action="?/decideAdjustment" use:approveEnhance>
		<input type="hidden" name="adjustmentId" bind:value={$approveForm.adjustmentId} />
		<input type="hidden" name="approve" value="true" />
		<Button type="submit" size="sm" variant="outline">
			<CircleCheckBig class="size-3.5" /> Approve
		</Button>
	</form>
	<form method="post" action="?/decideAdjustment" use:rejectEnhance>
		<input type="hidden" name="adjustmentId" bind:value={$rejectForm.adjustmentId} />
		<input type="hidden" name="approve" value="false" />
		<Button type="submit" size="sm" variant="destructive">
			<CircleX class="size-3.5" /> Reject
		</Button>
	</form>
</div>
