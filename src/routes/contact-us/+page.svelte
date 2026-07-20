<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardContent
	} from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { MailIcon, SendIcon, PhoneIcon, ClockIcon, Send, Phone } from '@lucide/svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { IconBrandFacebook, IconBrandInstagram, IconBrandTiktok } from '@tabler/icons-svelte';
	import { fly } from 'svelte/transition';
	import ImgSeparator from '$lib/components/imgSeparator.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	const { form, errors, enhance, delayed, message } = superForm(data.form, {
		dataType: 'json'
	});

	const socialLinks = [
		{
			name: m.contact_social_phone,
			url: 'tel:0901020304',
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
			url: 'https://t.me/danasteel',
			icon: Send,
			color: 'hover:text-red-600 hover:border-red-600/30'
		}
	];

	const contactInfo = [
		{
			key: 'email',
			icon: MailIcon,
			label: m.contact_email_support_label,
			value: 'support@dsfet.com',
			href: 'mailto:support@dsfet.com'
		},
		{
			key: 'phone',
			icon: PhoneIcon,
			label: m.contact_direct_call_whatsapp_label,
			value: '+251 9 01 02 03 04',
			href: 'https://wa.me/+251901020304'
		}
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
	class="relative min-h-dvh w-full overflow-hidden bg-background px-4 py-20 text-foreground transition-colors duration-300 sm:px-6 lg:px-8"
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
											{info.value}
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
							<div class="flex items-center justify-between border-b border-primary/5 pb-1.5">
								<span class="text-muted-foreground">{m.contact_day_mon_fri()}</span>
								<span class="font-mono font-semibold text-foreground">8:30 AM — 5:30 PM</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-muted-foreground">{m.contact_day_saturday()}</span>
								<span class="font-mono font-semibold text-foreground">8:30 AM — 12:00 PM</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>

		<ImgSeparator />

		<section transition:fly={{ y: 30, duration: 800, delay: 500 }} class="relative mt-16 w-full">
			<div class="absolute inset-0 -z-10 rounded-3xl bg-primary/5 blur-xl"></div>
			<iframe
				src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.3309312526444!2d38.73715996008017!3d9.033545988881428!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b85fef49d234f%3A0x37ebbe938f6e42e3!2s&#39;Yirga%20Haile&#39;%20Market%20Center%2C%20Fitawrari%20Gebeyebu%20St%2C%20Addis%20Ababa!5e0!3m2!1sen!2set!4v1781167286180!5m2!1sen!2set"
				style="border:0;"
				class="h-[40vh] w-full rounded-3xl border border-primary/10 shadow-lg lg:h-[50vh]"
				loading="lazy"
				referrerpolicy="no-referrer-when-downgrade"
				title={m.contact_map_title()}
			></iframe>
		</section>
	</main>
</div>
