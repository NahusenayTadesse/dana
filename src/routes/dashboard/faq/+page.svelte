<script lang="ts">
	import { untrack } from 'svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import { Plus, MessageCircleQuestion, RotateCcw } from '@lucide/svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Button } from '$lib/components/ui/button/index';
	import { FAQ_ICONS, FAQ_ICON_LABELS } from '$lib/faqItems';
	import { can } from '$lib/permissions';
	import Edit from './edit.svelte';
	import RowActions from './row-actions.svelte';
	import type { FaqTableRow } from './types';

	let { data } = $props();

	let addOpen = $state(false);

	const { form, errors, enhance, delayed, message } = untrack(() =>
		superForm(data.form, { dataType: 'json', id: 'faq-add' })
	);

	const {
		enhance: resetEnhance,
		delayed: resetDelayed,
		message: resetMessage
	} = untrack(() => superForm(data.resetForm, { resetForm: false, id: 'faq-reset' }));

	// "Restore originals" deletes every stored question, so it takes a second click.
	let confirmingReset = $state(false);

	// Two effects: with `$message ?? $resetMessage` the reset message was never
	// read (or toasted) once an add had produced a message.
	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') {
			toast.error($message.text);
		} else {
			toast.success($message.text);
			addOpen = false;
		}
	});

	$effect(() => {
		if (!$resetMessage) return;
		if ($resetMessage.type === 'error') toast.error($resetMessage.text);
		else toast.success($resetMessage.text);
		confirmingReset = false;
	});

	const iconItems = FAQ_ICONS.map((name) => ({ value: name, name: FAQ_ICON_LABELS[name] }));

	const rows = $derived(data.allData as FaqTableRow[]);
	const shown = $derived(rows.filter((row) => row.isActive).length);

	// Adding, editing, reordering, removing and restoring all need content.edit;
	// without it the page is a read-only list.
	const canEdit = $derived(can(data.access, 'content.edit'));

	const columns = $derived<ColumnDef<FaqTableRow, unknown>[]>([
		{ accessorKey: 'index', header: '#', cell: (info) => info.row.index + 1 },
		{
			accessorKey: 'questionEn',
			// Plain text: the Edit column holds the row's only edit form, so its
			// per-row superForm id isn't mounted twice.
			header: 'Question'
		},
		{
			accessorKey: 'questionAm',
			header: 'Amharic',
			cell: ({ row }) =>
				renderComponent(Statuses, { status: row.original.questionAm ? 'yes' : 'no' })
		},
		{
			accessorKey: 'icon',
			header: 'Icon',
			cell: ({ row }) => FAQ_ICON_LABELS[row.original.icon as keyof typeof FAQ_ICON_LABELS] ?? row.original.icon
		},
		{
			accessorKey: 'isActive',
			header: 'Status',
			cell: ({ row }) => renderComponent(Statuses, { status: row.original.isActive ? 'live' : 'inactive' })
		},
		...(canEdit
			? ([
					{
						accessorKey: 'edit',
						header: 'Edit',
						cell: ({ row }) =>
							renderComponent(Edit, { row: row.original, data: data.editForm, icon: true })
					},
					{
						accessorKey: 'order',
						header: 'Order / remove',
						cell: ({ row }) =>
							renderComponent(RowActions, {
								row: row.original,
								moveData: data.moveForm,
								deleteData: data.deleteForm,
								isFirst: row.index === 0,
								isLast: row.index === rows.length - 1
							})
					}
				] satisfies ColumnDef<FaqTableRow, unknown>[])
			: [])
	]);
</script>

<svelte:head>
	<title>FAQ</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-3 pb-4">
	<div>
		<h1 class="flex items-center gap-2 text-xl font-semibold">
			<MessageCircleQuestion class="h-5 w-5" /> Frequently Asked Questions
		</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">
			The questions on the About page, in the order they appear. {shown} of {rows.length} are showing.
		</p>
		{#if data.usingDefaults}
			<Badge variant="outline" class="mt-2">
				Showing the original questions — your first change saves them all as yours
			</Badge>
		{/if}
	</div>

	{#if canEdit}
		<div class="flex items-center gap-2">
			<form action="?/reset" method="post" use:resetEnhance id="faq-reset-form">
				<input type="hidden" name="confirm" value="true" />
				{#if confirmingReset}
					<div class="flex items-center gap-2">
						<span class="text-sm text-muted-foreground">Delete all your questions?</span>
						<Button type="submit" variant="destructive" form="faq-reset-form">
							{#if $resetDelayed}
								<LoadingBtn name="Restoring" />
							{:else}
								<RotateCcw class="h-4 w-4" /> Yes, restore originals
							{/if}
						</Button>
						<Button type="button" variant="outline" onclick={() => (confirmingReset = false)}>
							Cancel
						</Button>
					</div>
				{:else}
					<Button
						type="button"
						variant="outline"
						disabled={data.usingDefaults}
						onclick={() => (confirmingReset = true)}
					>
						<RotateCcw class="h-4 w-4" /> Restore originals
					</Button>
				{/if}
			</form>

			<DialogComp bind:open={addOpen} title="Add Question" variant="default" IconComp={Plus} size="lg">
				<form action="?/add" method="post" use:enhance id="faq-add-form" class="flex flex-col gap-3">
					<InputComp
						{form}
						{errors}
						label="Question (English)"
						type="text"
						name="questionEn"
						placeholder="Do you deliver outside Adama?"
						required={true}
					/>
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
						placeholder="Uncheck to add it hidden"
					/>

					<Button type="submit" class="mt-2" form="faq-add-form">
						{#if $delayed}
							<LoadingBtn name="Adding question" />
						{:else}
							<Plus /> Add question
						{/if}
					</Button>
				</form>
			</DialogComp>
		</div>
	{/if}
</div>

{#key data.allData}
	<DataTable {columns} data={rows} search={true} fileName="FAQ" />
{/key}
