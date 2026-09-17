<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import { selectItem, type Item } from '$lib/global.svelte';
	import * as m from '$lib/paraglide/messages.js';

	// `clearable` (opt-in) adds a "None" option that sets the value back to
	// null, for optional pickers — without it a picked value can never be unset.
	let {
		value = $bindable(),
		items,
		name,
		clearable = false,
		noneLabel = 'None'
	}: {
		value?: any;
		items: Item[];
		name: string;
		clearable?: boolean;
		noneLabel?: string;
	} = $props();

	// bits-ui treats '' as "nothing selected", so the None option needs its own value.
	const NONE = '__none__';

	const triggerContent = $derived(
		// Use String coercion to ensure "1" matches 1
		items.find((f: Item) => String(f.value) === String(value))?.name ??
			m.common_select_field({ field: name.replace(/([a-z])([A-Z])/g, '$1 $2') })
	);

	function getValue() {
		return clearable && value == null ? '' : value;
	}

	function setValue(next: any) {
		value = clearable && next === NONE ? null : next;
	}
</script>

<Select.Root type="single" {name} bind:value={getValue, setValue}>
	<Select.Trigger class="w-full capitalize">
		{triggerContent}
	</Select.Trigger>
	<Select.Content>
		{#if clearable}
			<Select.Item value={NONE} class="{selectItem} text-muted-foreground">{noneLabel}</Select.Item>
		{/if}
		{#each items as item (item.value)}
			<Select.Item value={item.value as string} class={selectItem}>{item.name}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
