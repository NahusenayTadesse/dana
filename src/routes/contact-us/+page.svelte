<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import {
		MailIcon,
		SendIcon,
		PhoneIcon,
		ClockIcon,
		MapPinIcon,
		FactoryIcon,
		Building2Icon,
		ArrowUpRightIcon,
		Send,
		Phone
	} from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { IconBrandFacebook, IconBrandInstagram, IconBrandTiktok } from '@tabler/icons-svelte';
	import { fly } from 'svelte/transition';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		dataType: 'json'
	});

	const socialLinks = [
		{
			name: m.contact_social_phone,
			url: 'tel:0919050607',
			icon: Phone,
			color: 'hover:text-pink-500 hover:border-pink-500/30'
		},
		{
			name: m.contact_social_instagram,
			url: 'https://www.instagram.com/dana_steel/',
			icon: IconBrandInstagram,
			color: 'hover:text-pink-500 hover:border-pink-500/30'
		},
		{
			name: m.contact_social_tiktok,
			url: 'https://www.tiktok.com/@danasteel',
			icon: IconBrandTiktok,
			color: 'hover:text-foreground hover:border-foreground/30'
		},
		{
			name: m.contact_social_facebook,
			url: 'https://web.facebook.com/danaflash0901020304?_rdc=1&_rdr#',
			icon: IconBrandFacebook,
			color: 'hover:text-blue-600 hover:border-blue-600/30'
		},
		{
			name: m.contact_social_telegram,
			url: 'https://t.me/+251911245892',
			icon: Send,
			color: 'hover:text-red-600 hover:border-red-600/30'
		}
	];

	// The two places DANA occupies. One entry each drives the contact list above
	// and the map card below, so the label, the address and the pin a customer
	// taps can never drift apart — they used to be written out three times, with
	// both addresses sharing the generic "Location" label.
	const locations = [
		{
			key: 'factory',
			icon: FactoryIcon,
			label: m.contact_factory_label,
			address: m.contact_factory_address_value,
			mapTitle: m.contact_map_factory_title,
			href: 'https://www.google.com/maps/search/?api=1&query=Adama%2C+Oromia%2C+Ethiopia',
			embed: 'https://www.google.com/maps?q=Adama,%20Oromia,%20Ethiopia&z=13&output=embed'
		},
		{
			key: 'office',
			icon: Building2Icon,
			label: m.contact_office_label,
			address: m.contact_office_address_value,
			mapTitle: m.contact_map_office_title,
			href: 'https://maps.app.goo.gl/nZwCjC4uNMCbV5eV7',
			// `!1d` is the embed's viewport span. It shipped at 63048, which framed
			// the whole of Addis with the office pin off-screen; 3940 is street
			// level, where the "DANA INDUSTRIAL EQUIPMENT SUPPLIER" marker shows.
			// The place id later in the string is what pins it, so it survives.
			embed:
				'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.0!2d38.67042494863281!3d9.014861600000009!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b8500410b9c13%3A0xabf29f54f3bb486b!2sDANA%20INDUSTRIAL%20EQUIPMENT%20SUPPLIER!5e0!3m2!1sen!2set!4v1787214479552!5m2!1sen!2set'
		}
	];

	const contactInfo = [
		{
			key: 'email',
			icon: MailIcon,
			label: m.contact_email_support_label,
			value: m.contact_email_value,
			href: 'mailto:support@dsfet.com'
		},
		{
			key: 'phone',
			icon: PhoneIcon,
			label: m.contact_direct_call_whatsapp_label,
			value: m.contact_phone_value,
			href: 'https://wa.me/251911245892'
		},
		...locations.map((loc) => ({
			key: `${loc.key}-address`,
			icon: MapPinIcon,
			label: loc.label,
			value: loc.address,
			href: loc.href
		}))
	];

	const openingHours = [
		{ key: 'weekdays', day: m.contact_day_mon_fri, hours: m.contact_hours_weekday_value },
		{ key: 'saturday', day: m.contact_day_saturday, hours: m.contact_hours_saturday_value }
	];

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') toast.error($message.text);
			else {
				toast.success($message.text);
			}
		}
	});
</script>

<svelte:head>
	<title>{m.contact_meta_title()}</title>
	<meta name="description" content={m.contact_meta_description()} />
</svelte:head>

<div
	class="relative min-h-dvh w-full overflow-hidden px-4 py-20 text-foreground transition-colors duration-300 sm:px-6 lg:px-8"
>
	<div
		class="absolute top-0 left-1/4 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/10 opacity-70 blur-3xl duration-4000 dark:bg-primary/5"
	></div>
	<div
		class="absolute right-1/4 bottom-0 -z-10 h-96 w-96 animate-pulse rounded-full bg-primary/5 opacity-70 blur-3xl duration-6000 dark:bg-primary/10"
	></div>

	<main class="mx-auto max-w-6xl">
		<div
			transition:fly={{ y: 30, duration: 800 }}
			class="mb-16 flex flex-col items-center gap-3 text-center"
		>
			<span
				class="rounded-full border border-primary/20 bg-primary/5 px-4 py-1 text-[11px] font-bold tracking-widest text-primary uppercase backdrop-blur-sm"
			>
				{m.contact_support_center_badge()}
			</span>
			<h2
				class="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl"
			>
				{m.contact_heading()}
			</h2>
			<p class="max-w-xl text-base text-muted-foreground">
				{m.contact_description()}
			</p>
		</div>

		<div class="grid gap-8 lg:grid-cols-3">
			<div transition:fly={{ y: 30, duration: 800, delay: 150 }} class="lg:col-span-2">
				<Card
					class="relative overflow-hidden border-primary/10 bg-gradient-to-br from-card/60 via-card/40 to-primary/5 shadow-xl backdrop-blur-md transition-all duration-500 hover:border-primary/20"
				>
					<div
						class="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(var(--primary),0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(var(--primary),0.03)_1px,transparent_1px)] bg-[size:24px_24px]"
					></div>

					<CardHeader>
						<CardTitle class="text-2xl font-bold tracking-tight">
							{m.contact_form_title()}
						</CardTitle>
						<CardDescription>{m.contact_form_description()}</CardDescription>
					</CardHeader>
					<CardContent>
						<form class="space-y-5" action="?/contact" method="POST" use:enhance>
							<div class="grid gap-4 sm:grid-cols-2">
								<InputComp
									{form}
									{errors}
									type="text"
									name="name"
									label={m.contact_full_name_label()}
									placeholder={m.contact_full_name_placeholder()}
								/>
								<InputComp
									type="email"
									{form}
									{errors}
									name="email"
									label={m.contact_email_label()}
									placeholder={m.contact_email_placeholder()}
								/>
							</div>

							<div class="grid gap-4 sm:grid-cols-2">
								<InputComp
									type="tel"
									{form}
									{errors}
									name="phoneNumber"
									label={m.contact_phone_label()}
									placeholder={m.contact_phone_placeholder()}
								/>
								<InputComp
									{form}
									{errors}
									type="text"
									name="subject"
									label={m.contact_subject_label()}
									placeholder={m.contact_subject_placeholder()}
								/>
							</div>

							<InputComp
								{form}
								{errors}
								type="textarea"
								name="contactMessage"
								label={m.contact_message_label()}
								placeholder={m.contact_message_placeholder()}
							/>

							<Button
								type="submit"
								class="group w-full gap-2 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(var(--primary),0.3)]"
							>
								{#if $delayed}
									<LoadingBtn name={m.contact_loading_message()} />
								{:else}
									<SendIcon
										class="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
									/>
									{m.contact_submit_inquiry()}
								{/if}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>

			<div class="flex flex-col gap-6">
				<div transition:fly={{ y: 20, duration: 600, delay: 200 }}>
					<Card class="border-primary/10 bg-card/40 shadow-md backdrop-blur-md">
						<CardHeader>
							<CardTitle class="text-lg font-bold tracking-wide">
								{m.contact_information_title()}
							</CardTitle>
						</CardHeader>
						<CardContent class="flex flex-col gap-3">
							{#each contactInfo as info (info.key)}
								<a
									href={info.href}
									class="group flex items-center gap-4 rounded-xl border border-primary/5 bg-primary/5 p-3.5 transition-all duration-300 hover:border-primary/20 hover:bg-primary/10"
								>
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/10 transition-all duration-300 group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground"
									>
										<info.icon
											class="h-5 w-5 text-primary transition-colors duration-300 group-hover:text-primary-foreground"
										/>
									</div>
									<div class="min-w-0 flex-1">
										<p class="text-xs font-medium text-muted-foreground">{info.label()}</p>
										<p class="truncate text-sm font-bold tracking-wide text-foreground">
											{info.value()}
										</p>
									</div>
								</a>
							{/each}
						</CardContent>
					</Card>
				</div>

				<div transition:fly={{ y: 20, duration: 600, delay: 300 }}>
					<Card class="border-primary/10 bg-card/40 shadow-md backdrop-blur-md">
						<CardHeader>
							<CardTitle class="text-lg font-bold tracking-wide">
								{m.contact_follow_us_title()}
							</CardTitle>
							<CardDescription class="text-sm text-muted-foreground">
								{m.contact_follow_us_description()}
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div class="grid grid-cols-2 gap-3">
								{#each socialLinks as social (social.url)}
									<a
										href={social.url}
										target="_blank"
										rel="noopener noreferrer"
										class="group flex flex-col items-center gap-2 rounded-xl border border-primary/5 bg-primary/5 p-4 text-center transition-all duration-300 hover:border-primary/30 hover:bg-primary/10 hover:shadow-md"
										title={social.name()}
									>
										<div
											class="rounded-lg bg-primary/5 p-2 transition-transform duration-300 group-hover:scale-110"
										>
											<social.icon class="h-5 w-5 text-primary" />
										</div>
										<span class="text-xs font-semibold tracking-wide">{social.name()}</span>
									</a>
								{/each}
							</div>
						</CardContent>
					</Card>
				</div>

				<div transition:fly={{ y: 20, duration: 600, delay: 400 }}>
					<Card
						class="border-primary/10 bg-gradient-to-br from-card/40 to-primary/5 shadow-md backdrop-blur-md"
					>
						<CardHeader class="flex flex-row items-center gap-2.5 pb-2">
							<ClockIcon class="h-5 w-5 text-primary" />
							<CardTitle class="!mt-0 text-lg font-bold tracking-wide">
								{m.contact_delivery_hours_title()}
							</CardTitle>
						</CardHeader>
						<CardContent class="space-y-3 text-sm font-light">
							{#each openingHours as slot (slot.key)}
								<div
									class="flex items-center justify-between gap-3 border-primary/5 pb-1.5 not-last:border-b"
								>
									<span class="text-muted-foreground">{slot.day()}</span>
									<span class="font-mono font-semibold text-foreground">{slot.hours()}</span>
								</div>
							{/each}
						</CardContent>
					</Card>
				</div>
			</div>
		</div>

		<!-- Two locations, two maps. They used to be a pair of unlabelled iframes
		     carrying the same title, so nothing on the page said which was the
		     factory and which was the office. Each now sits in a card that names
		     it and links straight out to directions. -->
		<section transition:fly={{ y: 30, duration: 800, delay: 500 }} class="relative mt-20">
			<div
				class="absolute inset-x-8 top-10 -z-10 h-64 rounded-full bg-primary/5 blur-3xl"
				aria-hidden="true"
			></div>

			<div class="mb-8 flex flex-col items-center gap-2 text-center">
				<h2 class="text-2xl font-extrabold tracking-tight sm:text-3xl">
					{m.contact_maps_heading()}
				</h2>
				<p class="max-w-xl text-sm text-muted-foreground">
					{m.contact_maps_description()}
				</p>
			</div>

			<div class="grid gap-5 lg:grid-cols-2">
				{#each locations as loc (loc.key)}
					<article
						class="group flex flex-col overflow-hidden rounded-3xl border border-primary/10 bg-card/40 shadow-lg backdrop-blur-md transition-all duration-300 hover:border-primary/25 hover:shadow-xl"
					>
						<header class="flex items-center gap-3 border-b border-primary/10 p-4">
							<span
								class="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-primary transition-transform duration-300 group-hover:scale-105"
							>
								<loc.icon class="size-5" />
							</span>

							<div class="min-w-0 flex-1">
								<p class="text-[11px] font-bold tracking-widest text-primary uppercase">
									{loc.label()}
								</p>
								<p class="truncate text-sm font-bold tracking-wide text-foreground">
									{loc.address()}
								</p>
							</div>

							<a
								href={loc.href}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors duration-300 hover:bg-primary hover:text-primary-foreground"
							>
								<span class="hidden sm:inline">{m.contact_map_directions()}</span>
								<ArrowUpRightIcon class="size-3.5" />
							</a>
						</header>

						<!-- Aspect ratio rather than a viewport height: the two cards stay
						     the same size as each other on every screen, and neither eats
						     half the page on a phone. -->
						<div class="relative aspect-4/3 w-full sm:aspect-16/10">
							<iframe
								src={loc.embed}
								title={loc.mapTitle()}
								class="absolute inset-0 h-full w-full"
								style="border:0;"
								loading="lazy"
								allowfullscreen
								referrerpolicy="no-referrer-when-downgrade"
							></iframe>
							<!-- Sits over the map edge only, so the frame reads as part of the
							     card without touching Google's own tiles or branding. -->
							<div
								class="pointer-events-none absolute inset-0 ring-1 ring-primary/10 ring-inset"
								aria-hidden="true"
							></div>
						</div>
					</article>
				{/each}
			</div>
		</section>
	</main>
</div>
