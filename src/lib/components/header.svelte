<script lang="ts">
	import {
		MenuIcon,
		XIcon,
		House as HomeIcon,
		ShoppingBagIcon,
		ShoppingCartIcon,
		InfoIcon,
		ContactIcon,
		LogInIcon,
		UserPlusIcon,
		Search,
		ArrowRight,
		SlidersHorizontal
	} from '@lucide/svelte';
	import { IconBrandWhatsapp, IconBrandTelegram } from '@tabler/icons-svelte';
	import DarkMode from './DarkMode.svelte';
	import AvatarSettings from './AvatarSettings.svelte';
	import { Sheet, SheetContent, SheetTrigger } from '$lib/components/ui/sheet';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { goto } from '$app/navigation';
	import { page, navigating } from '$app/state';
	import Cart from '$lib/components/floating-cart/cart.svelte';
	import LanguageSelector from './LanguageSelector.svelte';
	import * as m from '$lib/paraglide/messages.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { cn } from '$lib/utils.js';

	let { data } = $props();
	let isOpen = $state(false);
	let searchQuery = $state(page.url.searchParams.get('search') ?? '');

	const handleMenuClick = () => {
		isOpen = false;
	};

	// /buy sits right after /shop: browse the catalog, then build the order.
	// It's the page that actually takes an order, so it stays ahead of the
	// informational links rather than trailing them.
	const menuItems = [
		{ label: m.header_nav_home, href: '/', icon: HomeIcon },
		{ label: m.header_nav_shop, href: '/shop', icon: ShoppingBagIcon },
		{ label: m.header_nav_buy, href: '/buy', icon: ShoppingCartIcon },
		{ label: m.header_nav_about_us, href: '/about', icon: InfoIcon },
		{ label: m.header_nav_blog, href: '/blogs', icon: InfoIcon },
		{ label: m.header_nav_contact_us, href: '/contact-us', icon: ContactIcon }
	];

	// Direct chat channels. Same numbers/handles the footer and /contact-us use —
	// kept here so a customer can reach sales without first hunting for a page.
	const chatLinks = [
		{
			label: m.header_chat_whatsapp,
			href: 'https://wa.me/251911245892',
			icon: IconBrandWhatsapp,
			desktopClass: 'hover:bg-[#25D366]/10 hover:text-[#25D366]',
			mobileClass: 'border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10'
		},
		{
			label: m.header_chat_telegram,
			href: 'https://t.me/+251911245892',
			icon: IconBrandTelegram,
			desktopClass: 'hover:bg-[#229ED9]/10 hover:text-[#229ED9]',
			mobileClass: 'border-[#229ED9]/30 text-[#229ED9] hover:bg-[#229ED9]/10'
		}
	];

	import { afterNavigate } from '$app/navigation';
	let open = $state(false);
	afterNavigate(() => {
		open = false;
	});

	function executionDesktopSearch(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			const shopUrl = new URL('/shop', window.location.origin);
			if (searchQuery.trim()) {
				shopUrl.searchParams.set('search', searchQuery.trim());
			}
			goto(shopUrl.toString());
		}
	}

	$effect(() => {
		if (navigating.to) {
			isOpen = false;
		}
	});
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-brand/10 bg-background/70 px-2 py-1.5 backdrop-blur-xl transition-all duration-300 lg:px-12"
>
	<div class="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6">
		<!-- Logo — Dana white/card chip -->
		<a
			href="/"
			class="flex shrink-0 items-center rounded-2xl bg-card px-3.5 py-2 shadow-lg shadow-brand/10 ring-1 ring-brand/5 transition-transform duration-200 active:scale-95"
		>
			<img
				src="/logo.png"
				class="h-7 w-auto object-contain dark:brightness-110"
				alt={m.header_logo_alt()}
				fetchpriority="high"
			/>
		</a>

		<!-- Center nav -->
		<nav class="mx-auto hidden items-center gap-1 md:flex">
			{#each menuItems as item (item.href)}
				{@const isActive = page.url.pathname === item.href}
				<Button
					variant="ghost"
					size="sm"
					href={item.href}
					class={cn(
						'h-9 rounded-full px-4 text-sm font-semibold transition-colors',
						isActive
							? 'bg-brand/10 text-brand hover:bg-brand/15 hover:text-brand'
							: 'text-muted-foreground hover:bg-brand/5 hover:text-brand'
					)}
				>
					{item.label()}
				</Button>
			{/each}
		</nav>

		<div class="flex flex-row items-center gap-1.5 sm:gap-2">
			<!-- Search -->
			<Dialog.Root bind:open>
				<Dialog.Trigger>
					{#snippet child({ props })}
						<Button
							{...props}
							variant="ghost"
							size="icon"
							aria-label={m.header_search_placeholder()}
							class="size-9 rounded-full text-muted-foreground hover:bg-brand/5 hover:text-brand"
						>
							<Search class="size-4" />
						</Button>
					{/snippet}
				</Dialog.Trigger>
				<Dialog.Content class="rounded-2xl pt-8">
					<div class="relative mt-4 max-w-xs">
						<Search class="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
						<Input
							type="search"
							placeholder={m.header_search_placeholder()}
							bind:value={searchQuery}
							onkeydown={executionDesktopSearch}
							class="h-9 rounded-full border-border bg-muted/40 pl-9 text-xs shadow-inner focus-visible:border-brand focus-visible:ring-brand/20"
						/>
					</div>
				</Dialog.Content>
			</Dialog.Root>

			<!-- Direct chat -->
			{#each chatLinks as link (link.href)}
				<Button
					variant="ghost"
					size="icon"
					href={link.href}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={link.label()}
					title={link.label()}
					class={cn(
						// Shown where the bar has room: phones (>=360px) and wide desktops.
						// Between md and xl the centre nav already fills the row, so the
						// pair stays out of the bar there.
						'hidden size-8 rounded-full text-muted-foreground min-[360px]:inline-flex sm:size-9 md:hidden xl:inline-flex',
						link.desktopClass
					)}
				>
					<link.icon class="size-4 sm:size-4.5" stroke={1.75} />
				</Button>
			{/each}

			<!-- Desktop cluster -->
			<div class="hidden flex-row items-center justify-end gap-2 lg:flex">
				{#if data === '' || !data}
					<div class="flex items-center gap-1.5">
						<Button
							href="/login"
							variant="ghost"
							size="sm"
							class="h-10 gap-1.5 rounded-full px-4 text-sm font-semibold text-foreground/80 hover:bg-brand/5 hover:text-brand"
						>
							<LogInIcon class="size-4" />
							{m.header_sign_in()}
						</Button>
						<!-- Dana signature pill -->
						<Button
							href="/signup"
							size="sm"
							class="group h-10 gap-2 rounded-full bg-gradient-to-br from-brand-bright to-brand pr-1.5 pl-5 text-sm font-bold text-white shadow-lg shadow-brand/30 transition-transform hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/40"
						>
							{m.header_sign_up()}
							<span class="flex size-7 items-center justify-center rounded-full bg-white/95">
								<ArrowRight
									class="size-3.5 text-brand transition-transform group-hover:translate-x-0.5"
								/>
							</span>
						</Button>
					</div>
				{:else}
					<div class="flex items-center p-1">
						<AvatarSettings data={data.name} />
					</div>
				{/if}

				<!-- Subtle settings popover: dark mode + language -->
				<Popover.Root>
					<Popover.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon"
								aria-label={m.header_settings_label()}
								class="size-9 rounded-full text-muted-foreground hover:bg-brand/5 hover:text-brand"
							>
								<SlidersHorizontal class="size-4" />
							</Button>
						{/snippet}
					</Popover.Trigger>
					<Popover.Content
						align="end"
						sideOffset={10}
						class="w-56 rounded-2xl border-brand/10 p-2 shadow-xl shadow-brand/10"
					>
						<div class="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
							<span class="text-xs font-semibold text-muted-foreground">
								{m.header_appearance()}
							</span>
							<DarkMode />
						</div>
						<div class="my-1 h-px bg-border/70"></div>
						<div class="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5">
							<span class="text-xs font-semibold text-muted-foreground">
								{m.header_language()}
							</span>
							<LanguageSelector />
						</div>
					</Popover.Content>
				</Popover.Root>

				<Cart header={true} />
			</div>

			<!-- Mobile cluster -->
			<div class="flex items-center gap-2 md:hidden">
				<Cart header={true} />
				<Sheet bind:open={isOpen}>
					<SheetTrigger>
						{#snippet child({ props: triggerProps })}
							<Button
								variant="outline"
								size="icon"
								class="size-9 rounded-full border-brand/15 bg-card/60"
								{...triggerProps}
							>
								{#if isOpen}
									<XIcon class="size-4 text-foreground transition-transform duration-200" />
								{:else}
									<MenuIcon class="size-4 text-foreground transition-transform duration-200" />
								{/if}
							</Button>
						{/snippet}
					</SheetTrigger>
					<SheetContent
						side="right"
						class="flex w-80 flex-col border-l border-brand/10 bg-background/95 p-0 backdrop-blur-xl"
					>
						<div class="border-b border-brand/10 bg-muted/30 p-6">
							{#if data === '' || !data}
								<div class="space-y-1.5">
									<h2 class="text-base font-bold tracking-tight text-foreground">
										{m.header_mobile_welcome_title()}
									</h2>
									<p class="text-xs text-muted-foreground">
										{m.header_mobile_welcome_description()}
									</p>
								</div>
							{:else}
								<div class="flex items-center gap-3.5">
									<div class="rounded-full border border-brand/10 bg-card p-1 shadow-xs ring-2 ring-brand/5">
										<AvatarSettings data={data.name} />
									</div>
									<div class="flex flex-col overflow-hidden">
										<span class="truncate text-sm font-bold text-foreground">
											{data.name ?? m.header_default_user_name()}
										</span>
										<span class="truncate font-mono text-xs text-muted-foreground">
											{data.email ?? m.header_default_session_label()}
										</span>
									</div>
								</div>
							{/if}
						</div>

						<nav class="flex flex-1 flex-col gap-1.5 p-4">
							{#each menuItems as item (item.href)}
								{@const isMobileActive = page.url.pathname === item.href}
								<Button
									variant={isMobileActive ? 'secondary' : 'ghost'}
									href={item.href}
									class={cn(
										'w-full justify-start gap-3.5 rounded-2xl px-3.5 py-5.5 text-sm font-semibold tracking-wide transition-all active:scale-[0.98]',
										isMobileActive && 'bg-brand/10 text-brand'
									)}
									onclick={handleMenuClick}
								>
									<item.icon class="h-4 w-4 text-brand opacity-80" />
									{item.label()}
								</Button>
							{/each}
						</nav>

						<div class="space-y-4 border-t border-brand/10 bg-muted/10 p-5">
							<div class="grid grid-cols-2 gap-2.5">
								{#each chatLinks as link (link.href)}
									<Button
										variant="outline"
										href={link.href}
										target="_blank"
										rel="noopener noreferrer"
										onclick={handleMenuClick}
										class={cn(
											'h-10 gap-2 rounded-full bg-card/60 text-xs font-semibold',
											link.mobileClass
										)}
									>
										<link.icon class="size-4" stroke={1.75} />
										{link.label()}
									</Button>
								{/each}
							</div>
							<div class="flex flex-row items-center justify-between gap-2 rounded-2xl bg-card/60 px-3 py-2 ring-1 ring-brand/5">
								<span class="text-xs font-semibold text-muted-foreground">
									{m.header_appearance()}
								</span>
								<DarkMode />
							</div>
							<div class="flex flex-row items-center justify-between gap-2 rounded-2xl bg-card/60 px-3 py-2 ring-1 ring-brand/5">
								<span class="text-xs font-semibold text-muted-foreground">
									{m.header_language()}
								</span>
								<LanguageSelector />
							</div>

							{#if data === '' || !data}
								<div class="grid grid-cols-2 gap-2.5">
									<Button
										onclick={handleMenuClick}
										variant="outline"
										class="h-10 rounded-full border-brand/15 text-xs font-semibold"
										href="/login"
									>
										{m.header_log_in()}
									</Button>
									<Button
										onclick={handleMenuClick}
										class="h-10 rounded-full bg-gradient-to-br from-brand-bright to-brand text-xs font-bold text-white shadow-lg shadow-brand/30"
										href="/signup"
									>
										{m.header_join_store()}
									</Button>
								</div>
							{:else}
								<div class="flex flex-row items-center justify-between p-1">
									<AvatarSettings data={data.name} />
								</div>
							{/if}
						</div>
					</SheetContent>
				</Sheet>
			</div>
		</div>
	</div>
</header>