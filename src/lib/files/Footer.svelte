<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { siteImage } from '$lib/siteImages.svelte';
	import { siteSetting, siteSettingText } from '$lib/siteSettings.svelte';
	import { mailHref, telHref } from '$lib/siteSettings';

	// Phone and email come from Company Details in the dashboard, so the client
	// can change them without a deploy. They used to be literals here that had
	// drifted from every other copy on the site: the displayed number was the
	// 911 line while the `tel:` beside it dialled the 919 one, and the address
	// had drifted to a different email (info@danasteel.com).
	const phones = $derived(
		[siteSetting('contact_phone_primary'), siteSetting('contact_phone_secondary')]
			.map((value) => ({ value, href: telHref(value) }))
			.filter((phone) => phone.value && phone.href)
	);
	const emails = $derived(
		[siteSetting('contact_email_primary'), siteSetting('contact_email_secondary')]
			.map((value) => ({ value, href: mailHref(value) }))
			.filter((email) => email.value)
	);

	// /buy leads the column: it is the only link here that takes an order rather
	// than describing the company, so it should be the first thing found.
	const company = [
		{ label: m.footer_buy_link, href: '/buy' },
		{ label: m.footer_link_products, href: '/shop' },
		{ label: m.footer_link_factory, href: '/factory' },
		{ label: m.footer_link_about, href: '/about' }
	];
	const products = [
		{ label: m.footer_prod_ppgi, href: '/shop' },
		{ label: m.footer_prod_tiles, href: '/shop' },
		{ label: m.footer_prod_coils, href: '/shop' },
		{ label: m.footer_prod_accessories, href: '/shop' }
	];
</script>

<!-- Always-dark footer (kept navy in both themes, matching the reference) -->
<!--
	The fixed overlays reserved no space, so footer content sat permanently
	underneath them and could not be read or tapped:
	  · mobile — BottomMenu (h-20, bottom-0) + FloatingChat pill (bottom-22)
	    covered the phone number, email and address;
	  · desktop — FloatingChat (md:bottom-5) covered the copyright line.
	Hence padding at both breakpoints, larger on mobile where both overlays stack.
	The breakpoint is `md` because that is where BottomMenu hides; if that moves,
	this, FloatingChat and the floating cart button all move with it.
-->
<footer class="relative z-[2] bg-[#0C1B34] pb-40 text-[#B9CCEC] md:pb-28">
	<div
		class="mx-auto grid max-w-[1280px] gap-10 px-6 py-14 sm:grid-cols-2 md:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
	>
		<div>
			<a href="/" class="inline-flex rounded-xl bg-white px-3 py-2">
				<img
					src={siteImage('global.logo')}
					alt={m.header_logo_alt()}
					class="h-7 w-auto object-contain"
				/>
			</a>
			<p class="mt-4.5 max-w-[34ch] text-[14.5px] leading-relaxed">
				{m.footer_tagline()}
			</p>
		</div>

		<div>
			<div class="text-[13px] font-extrabold tracking-[0.12em] text-white uppercase">
				{m.footer_col_company()}
			</div>
			<div class="mt-4 flex flex-col gap-2.5 text-[14.5px]">
				{#each company as link (link.label)}
					<a href={link.href} class="w-fit transition-colors hover:text-white">{link.label()}</a>
				{/each}
			</div>
		</div>

		<div>
			<div class="text-[13px] font-extrabold tracking-[0.12em] text-white uppercase">
				{m.footer_col_products()}
			</div>
			<div class="mt-4 flex flex-col gap-2.5 text-[14.5px]">
				{#each products as link (link.label)}
					<a href={link.href} class="w-fit transition-colors hover:text-white">{link.label()}</a>
				{/each}
			</div>
		</div>

		<div>
			<div class="text-[13px] font-extrabold tracking-[0.12em] text-white uppercase">
				{m.footer_col_contact()}
			</div>
			<div class="mt-4 flex flex-col gap-2.5 text-[14.5px]">
				{#each phones as phone (phone.value)}
					<a href={phone.href} class="w-fit transition-colors hover:text-white">
						{phone.value}
					</a>
				{/each}
				{#each emails as email (email.value)}
					<a href={email.href} class="w-fit break-all transition-colors hover:text-white">
						{email.value}
					</a>
				{/each}
				<span>{siteSettingText('location_factory_address')}</span>
			</div>
		</div>
	</div>

	<!-- Company closing statement, sitting above the legal bar -->
	<div class="border-t border-white/10">
		<div class="mx-auto max-w-[1280px] px-6 py-6 md:px-8">
			<p class="max-w-[86ch] text-[14.5px] leading-relaxed font-semibold text-white/90">
				{m.closing_line()}
			</p>
		</div>
	</div>

	<div class="border-t border-white/10">
		<div
			class="mx-auto flex max-w-[1280px] flex-col gap-3 px-6 py-5 text-[13px] text-[#6B82A6] sm:flex-row sm:items-center sm:justify-between md:px-8"
		>
			<span>© {new Date().getFullYear()} {m.footer_copyright()}</span>

			<a
				href="https://digitalconstruct.com"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex w-fit items-center gap-2 transition-colors hover:text-white"
			>
				{m.footer_developed_by()}
				<span class="inline-flex rounded-md bg-white px-1.5 py-1">
					<!-- The one image on the site that is deliberately not an editable
					     slot: it is the builder's own mark, not the client's artwork, so
					     it points straight at the bundled asset. -->
					<img
						src="/digitalLogo.png"
						alt={m.alt_digital_construct()}
						class="h-3.5 w-auto object-contain"
					/>
				</span>
			</a>
		</div>
	</div>
</footer>
