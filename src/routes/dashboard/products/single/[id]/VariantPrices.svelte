<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, Trash2, DollarSign, Coins } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';

	import type { upsertVariantPrice, deleteVariantPrice } from './schema';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import DialogComp from '$lib/formComponents/DialogComp.svelte';
	import { formatETB } from '$lib/global.svelte';

	type Rate = {
		id: number;
		basis: string;
		price: string | number;
		priceIncludesVat: boolean | null;
	};

	let {
		variantId,
		variantLabel,
		rates = [],
		upsertData,
		deleteData
	}: {
		variantId: number;
		variantLabel: string;
		rates?: Rate[];
		upsertData: SuperValidated<Infer<typeof upsertVariantPrice>>;
		deleteData: SuperValidated<Infer<typeof deleteVariantPrice>>;
	} = $props();

	const basisItems = [
		{ value: 'quantity', name: 'Per piece' },
		{ value: 'length', name: 'Per length (e.g. meter)' },
		{ value: 'width', name: 'Per width' },
		{ value: 'thickness', name: 'Per thickness' },
		{ value: 'color', name: 'Per colour' },
		{ value: 'weight', name: 'Per weight (kg/ton)' },
		{ value: 'area', name: 'Per area (m²)' }
	];

	const {
		form: upsertForm,
		errors: upsertErrors,
		enhance: upsertEnhance,
		delayed: upsertDelayed,
		message: upsertMessage
	} = superForm(upsertData, {
		id: `variant-price-${variantId}`,
		dataType: 'json',
		resetForm: false
	});
	$upsertForm.variantId = variantId;

	const { form: deleteForm, enhance: deleteEnhance, message: deleteMessage } = superForm(
		deleteData,
		{
			id: `variant-price-delete-${variantId}`,
			dataType: 'json',
			resetForm: false
		}
	);

	$effect(() => {
		if ($upsertMessage) {
			if ($upsertMessage.type === 'error') toast.error($upsertMessage.text);
			else toast.success($upsertMessage.text);
		}
	});
	$effect(() => {
		if ($deleteMessage) {
			if ($deleteMessage.type === 'error') toast.error($deleteMessage.text);
			else toast.success($deleteMessage.text);
		}
	});

	const basisLabel = (basis: string) => basisItems.find((b) => b.value === basis)?.name ?? basis;
</script>

<DialogComp title="Price Book — {variantLabel}" variant="outline" IconComp={Coins}>
	<div class="flex flex-col gap-6 pt-4">
		<div class="flex flex-col gap-2">
			<h3 class="text-sm font-medium text-muted-foreground">Current Rates</h3>
			{#if rates.length === 0}
				<p class="text-sm italic text-muted-foreground">No standard rates set for this variant yet.</p>
			{:else}
				<div class="flex flex-col divide-y rounded-lg border">
					{#each rates as rate (rate.id)}
						<div class="flex items-center justify-between px-3 py-2">
							<div>
								<p class="text-sm font-medium">{basisLabel(rate.basis)}</p>
								<p class="text-xs text-muted-foreground">
									{formatETB(Number(rate.price))}{rate.priceIncludesVat ? ' (incl. VAT)' : ''}
								</p>
							</div>
							<form method="post" action="?/deleteVariantPrice" use:deleteEnhance>
								<input type="hidden" name="id" bind:value={$deleteForm.id} />
								<Button
									type="submit"
									variant="destructive"
									size="sm"
									onclick={() => ($deleteForm.id = rate.id)}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</form>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="flex flex-col gap-3">
			<h3 class="text-sm font-medium text-muted-foreground">Add / Update a Rate</h3>
			<form
				method="post"
				action="?/upsertVariantPrice"
				use:upsertEnhance
				class="flex flex-col gap-3"
			>
				<input type="hidden" name="variantId" bind:value={$upsertForm.variantId} />

				<InputComp
					form={upsertForm}
					errors={upsertErrors}
					type="select"
					name="basis"
					label="Basis"
					placeholder="Select what this rate is priced by"
					items={basisItems}
				/>

				<InputComp
					form={upsertForm}
					errors={upsertErrors}
					type="number"
					name="price"
					label="Rate (ETB)"
					placeholder="0.00"
				/>

				<InputComp
					form={upsertForm}
					errors={upsertErrors}
					type="checkboxSingle"
					name="priceIncludesVat"
					label=""
					placeholder="Price includes VAT"
				/>

				<Button type="submit" size="lg" disabled={$upsertDelayed}>
					{#if $upsertDelayed}
						<LoadingBtn name="Saving Rate" />
					{:else}
						<Save class="mr-2 h-4 w-4" /> Save Rate
					{/if}
				</Button>
			</form>
		</div>
	</div>
</DialogComp>
