<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import type { RequestBalance as schema } from './schema';
	import type { Infer, SuperValidated } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import { Link2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	let { data, orderId }: { data: SuperValidated<Infer<schema>>; orderId: number } = $props();

	const { form, enhance, delayed, message } = superForm(data, {
		id: `request-balance-${orderId}`,
		resetForm: false
	});

	$effect(() => {
		if ($message) {
			$message.type === 'error' ? toast.error($message.text) : toast.success($message.text);
		}
	});

	$form.orderId = orderId;
</script>

<form method="post" action="?/requestBalance" use:enhance>
	<input bind:value={$form.orderId} name="orderId" type="hidden" />
	<Button type="submit" size="sm" variant="outline">
		{#if $delayed}
			<LoadingBtn name="Sending..." />
		{:else}
			<Link2 class="size-3.5" /> Request Balance Payment
		{/if}
	</Button>
</form>
