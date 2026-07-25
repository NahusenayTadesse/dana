<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet/index.js';
	import { Button, type ButtonVariant } from '$lib/components/ui/button/index.js';
	import { Trash } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import type { Component } from 'svelte';
	import type { IconProps } from '@lucide/svelte';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import { cn } from '$lib/utils.js';

	let {
		title,
		children,
		variant = 'default',
		IconComp,
		size = 'md',
		class: className = ''
	}: {
		title: string;
		children: Snippet;
		variant?: ButtonVariant;
		IconComp?: Component<IconProps>;
		/** Pick per call site: sm for tiny forms, xl/full for big ones */
		size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
		class?: string;
	} = $props();

	const sizes = {
		sm: 'sm:w-96',
		md: 'sm:w-[32rem]',
		lg: 'sm:w-[44rem]',
		xl: 'sm:w-[60rem]',
		full: 'sm:w-[95vw]'
	};
</script>

<Sheet.Root>
	<Sheet.Trigger class="w-auto border-0">
		{#snippet child({ props })}
			<Button size="sm" class="border-0" {variant} {...props}>
				{#if variant === 'destructive'}
					<Trash />
				{:else if IconComp}
					<IconComp />
				{/if}
				{title}
			</Button>
		{/snippet}
	</Sheet.Trigger>

	<!--
		Explicit width, not auto-sizing:
		- w-full on mobile (full-screen sheet)
		- fixed width per `size` on desktop, clamped to 95vw
		- sm:max-w-none kills the library's built-in sm:max-w-sm cap
	-->
	<Sheet.Content
		side="right"
		class={cn(
			'flex w-full flex-col gap-0 sm:max-w-[95vw]',
			sizes[size],
			className
		)}
	>
		<Sheet.Header class="shrink-0 border-b px-4 py-3">
			<Sheet.Title>{title}</Sheet.Title>
		</Sheet.Header>

		<ScrollArea class="min-h-0 w-full flex-1" orientation="vertical">
			<!--
				w-full + min-w-0: content fits the sheet, never dictates its width.
				The [&_img] / [&_video] rules re-assert media constraints in case
				anything inside opts out of preflight.
			-->
			<div
				class="w-full min-w-0 px-4 py-4 pr-5
					[&_img]:h-auto [&_img]:max-w-full
					[&_video]:h-auto [&_video]:max-w-full"
			>
				{@render children()}
			</div>
		</ScrollArea>
	</Sheet.Content>
</Sheet.Root>