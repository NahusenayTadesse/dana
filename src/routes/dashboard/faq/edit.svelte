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
	import { FAQ_ICONS, FAQ_ICON_LABELS } from '$lib/faqItems';
	import type { EditFaq } from './schema';
	import type { FaqTableRow } from './types';

	let {
		data,
		row,
		icon = false
	}: {
		data: SuperValidated<EditFaq>;
		row: FaqTableRow;
		icon?: boolean;
	} = $props();

	let open = $state(false);

	const { form, errors, enhance, delayed, message, allErrors } = untrack(() =>
		superForm(data, { resetForm: false, dataType: 'json', id: `faq-${row.id}` })
	);

	untrack(() => {
		$form.id = row.id;
		$form.icon = row.icon as EditFaq['icon'];
		$form.questionEn = row.questionEn;
		$form.questionAm = row.questionAm ?? '';
		$form.answerEn = row.answerEn;
		$form.answerAm = row.answerAm ?? '';
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

	const iconItems = FAQ_ICONS.map((name) => ({ value: name, name: FAQ_ICON_LABELS[name] }));
</script>

<DialogComp
	bind:open
	title={icon ? 'Edit' : row.questionEn}
	IconComp={icon ? SquarePen : undefined}
	variant="ghost"
	size="lg"
>
	<form action="?/edit" method="post" use:enhance id="faq-edit-{row.id}" class="flex flex-col gap-3">
		<Errors allErrors={$allErrors} />

		<InputComp {form} {errors} label="Question (English)" type="text" name="questionEn" required={true} />
		<InputComp
			{form}
			{errors}
			label="Answer (English)"
			type="textarea"
			name="answerEn"
			rows={4}
			required={true}
		/>
		<InputComp {form} {errors} label="Question (Amharic)" type="text" name="questionAm" />
		<InputComp {form} {errors} label="Answer (Amharic)" type="textarea" name="answerAm" rows={4} />
		<p class="px-1 text-xs text-muted-foreground">
			Leave the Amharic blank and visitors reading the site in Amharic see the English.
		</p>

		<InputComp {form} {errors} label="Icon" type="select" name="icon" items={iconItems} />
		<InputComp
			{form}
			{errors}
			label="Shown on the site"
			type="checkboxSingle"
			name="isActive"
			placeholder="Uncheck to hide it without deleting it"
		/>

		<Button type="submit" class="mt-2" form="faq-edit-{row.id}">
			{#if $delayed}
				<LoadingBtn name="Saving changes" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</form>
</DialogComp>
