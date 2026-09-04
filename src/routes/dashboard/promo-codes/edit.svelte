<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm, type SuperValidated } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import { Save, SquarePen } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import DateField from './date-field.svelte';
	import type { Edit } from './schema';
	import type { PromoRow } from './types';

	let {
		data,
		row,
		icon = false
	}: {
		data: SuperValidated<Edit>;
		row: PromoRow;
		icon?: boolean;
	} = $props();

	let open = $state(false);

	// One superForm per row, so each needs its own id — sharing one makes every
	// dialog on the page answer to the same submission.
	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `promo-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.code = row.code;
		$form.discountPercentage = row.discountPercentage;
		$form.reason = row.reason;
		$form.startsAt = row.startsAt;
		$form.expiresAt = row.expiresAt;
		$form.maxUses = row.maxUses;
		$form.isActive = row.isActive;
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

<DialogComp
	bind:open
	title={icon ? 'Edit' : row.code}
	IconComp={icon ? SquarePen : undefined}
	variant="ghost"
	size="md"
>
	<form action="?/edit" method="post" use:enhance id="edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />

		<InputComp {form} {errors} label="Code" type="text" name="code" required={true} />
		<InputComp
			{form}
			{errors}
			label="Discount (%)"
			type="number"
			name="discountPercentage"
			min="0.01"
			max="100"
			required={true}
		/>
		<InputComp
			{form}
			{errors}
			label="Reason"
			type="text"
			name="reason"
			placeholder="New Year promo, reseller partner…"
		/>

		<DateField {form} {errors} label="Starts" name="startsAt" hint="Leave blank to start now" />
		<DateField
			{form}
			{errors}
			label="Ends"
			name="expiresAt"
			hint="Leave blank for no end date. The code works all through this day."
		/>

		<InputComp
			{form}
			{errors}
			label="Usage limit"
			type="number"
			name="maxUses"
			min="1"
			placeholder="Leave blank for unlimited"
		/>
		<p class="px-1 text-xs text-muted-foreground">
			Used {row.timesUsed}
			{row.timesUsed === 1 ? 'time' : 'times'} so far. Changing the limit does not reset that.
		</p>

		<InputComp
			{form}
			{errors}
			label="Available"
			type="checkboxSingle"
			name="isActive"
			placeholder="Sales staff can apply this code"
		/>

		<Button type="submit" class="mt-2" form="edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
