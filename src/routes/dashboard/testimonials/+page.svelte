<script>
	import { untrack } from 'svelte';
	import { renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTable from '$lib/components/Table/data-table.svelte';
	import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
	import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
	import Statuses from '$lib/components/Table/statuses.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { Button } from '$lib/components/ui/button/index';
	import Edit from './edit.svelte';
	import Delete from './delete.svelte';
	import BigText from './bigText.svelte';
	import ImageViewer from '$lib/components/Table/image-viewer.svelte';
	import { can } from '$lib/permissions';

	let { data } = $props();

	// Adding, editing and deleting testimonials all need content.edit.
	const canEdit = $derived(can(data.access, 'content.edit'));

	const columns = $derived([
		{
			id: 'index',
			header: '#',
			cell: (info) => {
				const rowIndex = info.table.getRowModel().rows.findIndex((row) => row.id === info.row.id);
				return rowIndex + 1;
			},
			enableSorting: false
		},
		{
			accessorKey: 'avatar',
			header: 'Image',
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(ImageViewer, {
					src: row.original.avatar,
					alt: row.original.name
				});
			}
		},
		{
			accessorKey: 'name',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Name',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true
		},

		{
			accessorKey: 'position',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Position',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true
		},

		{
			accessorKey: 'testimonial',
			header: 'Testimonials',
			sortable: true,
			cell: ({ row }) => renderComponent(BigText, { text: row.original.testimonial })
		},

		{
			accessorKey: 'isApproved',
			header: 'On website',
			sortable: true,
			cell: ({ row }) =>
				renderComponent(Statuses, { status: row.original.isApproved ? 'live' : 'pending' })
		},

		{
			accessorKey: 'createdBy',
			header: ({ column }) =>
				renderComponent(DataTableSort, {
					name: 'Created By',
					onclick: column.getToggleSortingHandler()
				}),
			sortable: true,
			cell: ({ row }) => {
				return renderComponent(DataTableLinks, {
					id: row.original.createdById,
					name: row.original.createdBy,
					link: '/dashboard/admin-panel/users'
				});
			}
		},

		...(canEdit
			? [
					{
						id: 'edit',
						header: 'Edit',
						enableSorting: false,
						cell: ({ row }) => {
							// The only edit sheet per row: two instances of the same form would
							// share an id and the action result would land in the closed one.
							return renderComponent(Edit, {
								id: row.original.id,
								name: row.original.name,
								position: row.original.position,
								testimonial: row.original.testimonial,
								avatar: row.original.avatar,
								isApproved: row.original.isApproved,
								action: '?/edit',
								data: data.editForm
							});
						}
					},
					{
						id: 'delete',
						header: 'Delete',
						enableSorting: false,
						cell: ({ row }) => {
							return renderComponent(Delete, {
								id: row.original.id,
								action: '?/delete',
								data: data.deleteForm
							});
						}
					}
				]
			: [])
	]);
	import { superForm } from 'sveltekit-superforms/client';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Plus } from '@lucide/svelte';

	const { form, errors, enhance, delayed, message } = untrack(() => superForm(data.form, {}));

	import { toast } from 'svelte-sonner';
	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});
</script>

<svelte:head>
	<title>Testimonials</title>
</svelte:head>
{#key data?.allTestimonials}
	{#if canEdit}
		<DialogComp title="+ Add New Testimonial" variant="default">
			<form
				action="?/add"
				use:enhance
				id="main"
				class="flex flex-col gap-4"
				method="post"
				enctype="multipart/form-data"
			>
				<InputComp {form} {errors} label="Name of Customer" type="text" name="name" required={true} />
				<InputComp {form} {errors} label="Position" type="text" name="position" />
				<InputComp {form} {errors} label="Testimonial" type="textarea" name="testimonial" />
				<InputComp
					{form}
					{errors}
					label="Logo or Avatar"
					type="file"
					name="avatar"
					placeholder="JPEG, PNG, WEBP, AVIF or GIF (Max 10MB)"
				/>
				<InputComp
					{form}
					{errors}
					label="Approved"
					type="checkboxSingle"
					name="isApproved"
					placeholder="Show on website"
				/>

				<Button type="submit" form="main">
					{#if $delayed}
						<LoadingBtn name="Adding Testimonial" />
					{:else}
						<Plus /> Add Testimonial
					{/if}
				</Button>
			</form>
		</DialogComp>
	{/if}

	<DataTable {columns} data={data?.allTestimonials} search={true} fileName="Testimonial" />
{/key}
