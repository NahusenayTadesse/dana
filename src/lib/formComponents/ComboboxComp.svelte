<script lang="ts">
	/**
	 * ComboboxComp — drop-in replacement for the old combobox.
	 *
	 * Backward-compatible behavior kept:
	 * - Placeholder / search / empty text auto-derived from `name`
	 *   ("paymentMethod" → "Select payment Method") unless overridden.
	 * - `capitalize` on the trigger label.
	 * - `selectItem` class from global.svelte applied to items.
	 * - Hidden input carrying name/value/required for native form posts.
	 *
	 * New fixes:
	 * - Trigger truncates long names (full name via `title` tooltip)
	 *   instead of clipping or blowing out the layout.
	 * - Dropdown width is anchored to the trigger and portalled, so it
	 *   works inside dialogs/sheets without clipping or mushing.
	 * - Option rows wrap so long names stay fully readable in the list.
	 * - String-coerced matching everywhere (check icon included).
	 * - Optional `disabled` + `placeholder` props.
	 */
	import CheckIcon from '@lucide/svelte/icons/check';
	import ChevronsUpDownIcon from '@lucide/svelte/icons/chevrons-up-down';
	import { tick } from 'svelte';
	import * as Command from '$lib/components/ui/command/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { selectItem } from '$lib/global.svelte';
	import * as m from '$lib/paraglide/messages.js';

	type Item = {
		value: string | number;
		name: string;
	};

	let {
		items = [],
		name = '',
		value = $bindable(),
		required = false,
		disabled = false,
		placeholder,
		searchPlaceholder,
		emptyText
	}: {
		items?: Item[];
		name?: string;
		value?: string | number | undefined;
		required?: boolean;
		disabled?: boolean;
		placeholder?: string;
		searchPlaceholder?: string;
		emptyText?: string;
	} = $props();

	let open = $state(false);
	let triggerRef = $state<HTMLButtonElement>(null!);

	// "paymentMethod" → "payment Method" (same regex as before)
	const prettyName = $derived(name.replace(/([a-z0-9])([A-Z])/g, '$1 $2'));
	const titleName = $derived(prettyName.replace(/\b\w/g, (c) => c.toUpperCase()));

	const selected = $derived(items.find((f) => String(f.value) === String(value)));
	const triggerContent = $derived(
		selected?.name ?? placeholder ?? m.common_select_field({ field: prettyName })
	);

	// Refocus the trigger after selecting so keyboard users can keep
	// navigating the rest of the form.
	function select(item: Item) {
		value = item.value;
		open = false;
		tick().then(() => triggerRef?.focus());
	}
</script>

<Popover.Root bind:open>
	<Popover.Trigger bind:ref={triggerRef} {disabled}>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="outline"
				role="combobox"
				aria-expanded={open}
				title={selected?.name ?? ''}
				class="h-10 w-full min-w-0 justify-between font-normal"
			>
				<span class={cn('truncate text-left capitalize', !selected && 'text-muted-foreground')}>
					{triggerContent}
				</span>
				<ChevronsUpDownIcon class="ml-2 size-4 shrink-0 opacity-50" />
			</Button>
		{/snippet}
	</Popover.Trigger>

	{#if name}
		<input type="hidden" {name} value={value ?? ''} {required} />
	{/if}

	<Popover.Content
		align="start"
		sideOffset={4}
		class="w-[var(--bits-popover-anchor-width)] min-w-[var(--bits-popover-anchor-width)] p-0"
	>
		<Command.Root>
			<Command.Input
				placeholder={searchPlaceholder ?? m.common_search_field({ field: titleName })}
				class="h-9"
			/>
			<Command.List
				class="max-h-[min(280px,var(--bits-popover-content-available-height,280px))] overflow-y-auto"
			>
				<Command.Empty class="py-4 text-center text-sm text-muted-foreground">
					{emptyText ?? m.common_no_field_found({ field: prettyName })}
				</Command.Empty>
				<Command.Group>
					{#each items as item (item.value)}
						<Command.Item
							value={item.name}
							keywords={[item.name]}
							onSelect={() => select(item)}
							class={cn(selectItem, 'items-start gap-2 py-2')}
						>
							<CheckIcon
								class={cn(
									'mt-0.5 size-4 shrink-0',
									String(item.value) !== String(value) && 'text-transparent'
								)}
							/>
							<!-- Wrap, don't clip: full names always readable in the list. -->
							<span class="min-w-0 flex-1 whitespace-normal break-words leading-snug capitalize">
								{item.name}
							</span>
						</Command.Item>
					{/each}
				</Command.Group>
			</Command.List>
		</Command.Root>
	</Popover.Content>
</Popover.Root>