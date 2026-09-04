<script lang="ts">
	import type { Icon } from '@tabler/icons-svelte';
	import { cn } from '$lib/utils.js';

	/**
	 * A round chat-channel button that rides above one of the two floating
	 * widgets. These used to sit in the header bar, where they competed with the
	 * nav for room and vanished entirely between md and xl.
	 *
	 * It renders nothing when its link is blank, so clearing WhatsApp or
	 * Telegram in Company Details removes the button rather than leaving one
	 * that goes nowhere.
	 */
	let {
		href,
		label,
		icon: IconComp,
		brand,
		class: className = ''
	}: {
		href: string;
		label: string;
		// Tabler's own icon type — these are legacy class components, so the
		// modern `Component<...>` shape does not describe them.
		icon: Icon;
		/** The channel's own colour, for the ring and the icon. */
		brand: string;
		class?: string;
	} = $props();
</script>

{#if href}
	<a
		{href}
		target="_blank"
		rel="noopener noreferrer"
		aria-label={label}
		title={label}
		style="--channel: {brand}"
		class={cn(
			// One size down from the widget it sits above, so the primary action
			// still reads as the primary one.
			'flex size-12 items-center justify-center rounded-full border border-[color:var(--channel)]/30',
			'bg-background text-[color:var(--channel)] shadow-lg',
			'transition-transform hover:scale-105 active:scale-95',
			'focus-visible:ring-2 focus-visible:ring-[color:var(--channel)]/50 focus-visible:outline-none',
			'motion-reduce:transition-none motion-reduce:hover:scale-100',
			className
		)}
	>
		<IconComp class="size-6" stroke={1.75} />
	</a>
{/if}
