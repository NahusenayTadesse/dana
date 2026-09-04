<script lang="ts">
	import { untrack } from 'svelte';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';
	import {
		RotateCcw,
		Save,
		Phone,
		Mail,
		MessageCircle,
		MapPin,
		Clock,
		Hash,
		Megaphone,
		Video,
		Users,
		Palette,
		Receipt,
		BellRing
	} from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import {
		SITE_SETTING_GROUPS,
		type SettingGroup,
		type SettingScreen,
		type SettingFieldView
	} from '$lib/siteSettings';

	/**
	 * The whole of a settings screen. Company Details and Page Text differ only
	 * by which slice of the registry they are handed, so they share this rather
	 * than keeping two copies of the same form in step by hand.
	 */
	let {
		data,
		screen,
		title,
		intro
	}: {
		data: any;
		screen: SettingScreen;
		title: string;
		intro: string;
	} = $props();

	const {
		form,
		errors,
		enhance,
		delayed,
		message: saveMessage,
		allErrors
	} = untrack(() => superForm(data.form, { resetForm: false, id: `settings-${screen}` }));

	const {
		enhance: resetEnhance,
		delayed: resetDelayed,
		message: resetMessage
	} = untrack(() => superForm(data.resetForm, { resetForm: false, id: `settings-${screen}-reset` }));

	$effect(() => {
		const msg = $saveMessage ?? $resetMessage;
		if (!msg) return;
		if (msg.type === 'error') toast.error(msg.text);
		else toast.success(msg.text);
	});

	const customised = $derived(new Set<string>(data.customised));

	const groupIcons: Record<SettingGroup, typeof Phone> = {
		'Phone numbers': Phone,
		'Email addresses': Mail,
		'Addresses & maps': MapPin,
		'Opening hours': Clock,
		'Social & chat': MessageCircle,
		'Key figures': Hash,
		'Homepage hero': Users,
		'Homepage video': Video,
		'Homepage call to action': Megaphone,
		'RAL colours': Palette,
		'Tax & pricing': Receipt,
		Alerts: BellRing
	};

	const groupNotes: Record<SettingGroup, string> = {
		'Phone numbers':
			'Write them the way you want customers to read them — the tap-to-call link is worked out from what you type.',
		'Email addresses': 'The main address is used everywhere. The second one is optional.',
		'Addresses & maps':
			'Each address is written twice, once per language, so editing the English does not drop the Amharic. For a map, open Google Maps → Share → Embed a map and paste the src from the code it gives you.',
		'Opening hours':
			'Clear Saturday for a week you are closed. The holiday notice is blank until you write one, and appears under the hours.',
		'Social & chat': 'Leave a link blank to take that button off the site.',
		'Key figures':
			'The big numbers on the About and Factory pages. The wording beside each one is fixed — these are the figures themselves.',
		'Homepage video':
			'The factory tour video on the homepage. Paste the link from YouTube — the address bar or the Share button, either works.',
		'Homepage call to action':
			'The band at the very bottom of the homepage, in both languages.',
		'Homepage hero':
			'The small line beside the customer avatars near the top of the homepage, in both languages.',
		'RAL colours':
			'The four paint swatches on the homepage colour band. Clear a code to drop that swatch — the band is happy with three or two.',
		'Tax & pricing':
			'Applies from the moment you save. Orders already priced keep the rate they were quoted at.',
		Alerts: 'Who hears about a new order or quote request.'
	};

	const byGroup = $derived(
		SITE_SETTING_GROUPS[screen].map((group) => ({
			group,
			Icon: groupIcons[group],
			note: groupNotes[group],
			fields: data.fields.filter((field: SettingFieldView) => field.group === group)
		}))
	);

	// A field only counts as changed once it differs from what the code ships —
	// that is exactly the rule the save action uses to decide whether to write a
	// row, so the badge and the database can never disagree.
	const changedCount = $derived(customised.size);
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="flex flex-wrap items-start justify-between gap-4 pb-5">
	<div>
		<h1 class="text-xl font-semibold">{title}</h1>
		<p class="max-w-[70ch] text-sm text-muted-foreground">{intro}</p>
		<div class="mt-2 flex flex-wrap gap-2">
			<Badge variant="secondary">{data.fields.length} fields</Badge>
			<Badge variant={changedCount ? 'default' : 'outline'}>
				{changedCount === 0 ? 'All original' : `${changedCount} changed`}
			</Badge>
		</div>
	</div>

	<form action="?/reset" method="post" use:resetEnhance id="reset-{screen}">
		<input type="hidden" name="confirm" value="true" />
		<Button type="submit" variant="outline" form="reset-{screen}" disabled={changedCount === 0}>
			{#if $resetDelayed}
				<LoadingBtn name="Restoring" />
			{:else}
				<RotateCcw class="h-4 w-4" /> Restore originals
			{/if}
		</Button>
	</form>
</div>

<form action="?/save" method="post" use:enhance id="save-{screen}" class="flex flex-col gap-5">
	<Errors allErrors={$allErrors} />

	{#each byGroup as section (section.group)}
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center gap-2 text-base">
					<section.Icon class="h-4 w-4" />
					{section.group}
				</CardTitle>
				<CardDescription>{section.note}</CardDescription>
			</CardHeader>
			<CardContent class="grid gap-4 md:grid-cols-2">
				{#each section.fields as field (field.key)}
					<div class={field.multiline ? 'flex flex-col md:col-span-2' : 'flex flex-col'}>
						<InputComp
							{form}
							{errors}
							label={field.label}
							type={field.multiline ? 'textarea' : 'text'}
							rows={2}
							name={field.key}
							placeholder={field.placeholder}
						/>
						<p class="px-1 text-xs text-muted-foreground">
							{field.description}
							{#if customised.has(field.key)}
								<span class="text-foreground">
									{#if field.default.length > 60}
										Changed from the original.
									{:else}
										Changed from “{field.default || 'blank'}”.
									{/if}
								</span>
							{/if}
						</p>
					</div>
				{/each}
			</CardContent>
		</Card>
	{/each}

	<div class="flex justify-end">
		<Button type="submit" form="save-{screen}">
			{#if $delayed}
				<LoadingBtn name="Saving" />
			{:else}
				<Save class="h-4 w-4" /> Save changes
			{/if}
		</Button>
	</div>
</form>
