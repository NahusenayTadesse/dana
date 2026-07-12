<script lang="ts">
	import { Languages } from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';
	import { invalidateAll } from '$app/navigation';

	const localeLabels: Record<string, string> = {
		en: 'English',
		am: 'አማርኛ (Amharic)'	};
	const localeShort: Record<string, string> = {
		en: 'EN',
		am: 'አማ'
	};

	const currentLang = getLocale();

	function changeLang(locale: string) {
		setLocale(locale);
		invalidateAll();
	}
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				size="sm"
				class="flex h-9 items-center gap-2 rounded-full px-3 transition-colors hover:bg-primary/5"
			>
				<Languages class="h-4 w-4 text-primary" />
				<span class="text-xs font-bold tracking-wider uppercase">
					{localeShort[currentLang]}
				</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end" class="w-40 rounded-2xl border-primary/10 p-2 shadow-xl">
		{#each locales as locale (locale)}
			<DropdownMenu.Item
				class={`cursor-pointer rounded-xl ${
					currentLang === locale ? 'bg-primary/5 font-semibold text-primary' : ''
				}`}
				onclick={() => changeLang(locale)}
			>
				{localeLabels[locale]}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
