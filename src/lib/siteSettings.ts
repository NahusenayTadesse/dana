/**
 * Company details the client can edit from the dashboard.
 *
 * Same shape as $lib/siteImages: the code declares every field with the value
 * the site currently ships, and a `site_settings` row overrides one. An empty
 * table renders the site exactly as before, and "restore defaults" is a DELETE.
 *
 * These values were previously written out by hand in header.svelte,
 * files/Footer.svelte, contact-us/+page.svelte and server/prompt.ts — five
 * copies of the phone number in four formats, and a footer whose displayed
 * number and `tel:` link were two different lines.
 */

import { youtubeId } from './youtube';
import { parseVatRate } from './vat';

export type SiteSettingKind = 'tel' | 'email' | 'url' | 'text';

/**
 * Three screens, so contact details, page wording and the operational numbers
 * do not end up in one endless form. A screen owns its keys outright: saving one never touches a
 * key belonging to the other.
 */
export type SettingScreen = 'company' | 'content' | 'operations';

export type SettingGroup =
	| 'Phone numbers'
	| 'Email addresses'
	| 'Addresses & maps'
	| 'Opening hours'
	| 'Social & chat'
	| 'Key figures'
	| 'Homepage hero'
	| 'Homepage video'
	| 'Homepage call to action'
	| 'RAL colours'
	| 'Tax & pricing'
	| 'Alerts';

export type SiteSettingField = {
	key: string;
	label: string;
	/** Section heading on the dashboard screen. */
	group: SettingGroup;
	/** Which dashboard screen edits this field. */
	screen: SettingScreen;
	kind: SiteSettingKind;
	/** What a visitor sees when this is set — shown under the input. */
	description: string;
	/** What the site shipped with. */
	default: string;
	placeholder: string;
	/** Optional fields hide their link when cleared; required ones cannot be blank. */
	optional?: boolean;
	/**
	 * Set on the two halves of a translated pair. The site picks the half that
	 * matches the visitor's language and falls back to English, so the client
	 * writes their address once per language rather than losing the Amharic
	 * version the moment they edit the English one.
	 */
	locale?: 'en' | 'am';
	/** Extra shape check beyond `kind`, e.g. "must be a Google Maps embed". */
	pattern?: RegExp;
	/** For checks a regex cannot express cleanly, like parsing a YouTube link. */
	validate?: (value: string) => boolean;
	patternMessage?: string;
	/** Render as a textarea — for the map embeds, which are unreadably long. */
	multiline?: boolean;
};

/** Locales the translated pairs cover, in fallback order. */
export const SETTING_LOCALES = ['en', 'am'] as const;

export const SITE_SETTING_FIELDS: SiteSettingField[] = [
	{
		key: 'contact_phone_primary',
		label: 'Main phone line',
		group: 'Phone numbers',
		screen: 'company',
		kind: 'tel',
		description: 'Shown in the footer and on the contact page, and quoted by the website assistant.',
		default: '0919 05 06 07',
		placeholder: '0919 05 06 07'
	},
	{
		key: 'contact_phone_secondary',
		label: 'Second phone line',
		group: 'Phone numbers',
		screen: 'company',
		kind: 'tel',
		description: 'The sales desk / WhatsApp line. Clear it to show only the main number.',
		default: '+251 911 24 58 92',
		placeholder: '+251 911 24 58 92',
		optional: true
	},
	{
		key: 'contact_email_primary',
		label: 'Main email address',
		group: 'Email addresses',
		screen: 'company',
		kind: 'email',
		description: 'Where the footer, the contact page and the assistant send people.',
		default: 'support@dsfet.com',
		placeholder: 'support@dsfet.com'
	},
	{
		key: 'contact_email_secondary',
		label: 'Second email address',
		group: 'Email addresses',
		screen: 'company',
		kind: 'email',
		description: 'Optional. Leave blank and only the main address is shown.',
		default: '',
		placeholder: 'info@danasteel.com',
		optional: true
	},
	{
		key: 'location_factory_address_en',
		label: 'Factory address (English)',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'text',
		description: 'The Adama factory, shown in the footer, on the contact page and on its map card.',
		default: 'Adama, Oromia, Ethiopia',
		placeholder: 'Adama, Oromia, Ethiopia',
		locale: 'en'
	},
	{
		key: 'location_factory_address_am',
		label: 'Factory address (Amharic)',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: 'አዳማ፣ ኦሮሚያ፣ ኢትዮጵያ',
		placeholder: 'አዳማ፣ ኦሮሚያ፣ ኢትዮጵያ',
		locale: 'am'
	},
	{
		key: 'location_factory_map_link',
		label: 'Factory directions link',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'url',
		description: 'Where the "open in Maps" arrow on the factory card goes.',
		default: 'https://www.google.com/maps/search/?api=1&query=Adama%2C+Oromia%2C+Ethiopia',
		placeholder: 'https://maps.app.goo.gl/…'
	},
	{
		key: 'location_factory_map_embed',
		label: 'Factory map embed',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'url',
		description:
			'The map itself. In Google Maps use Share → Embed a map and paste the src from the code it gives you.',
		default: 'https://www.google.com/maps?q=Adama,%20Oromia,%20Ethiopia&z=13&output=embed',
		placeholder: 'https://www.google.com/maps/embed?pb=…',
		pattern: /^https:\/\/(www\.)?google\.com\/maps/,
		patternMessage: 'Use the src from Google Maps → Share → Embed a map',
		multiline: true
	},
	{
		key: 'location_office_address_en',
		label: 'Head office address (English)',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'text',
		description: 'The Addis Ababa office, shown on the contact page and its map card.',
		default: 'Besrate Gebriel, Addis Ababa, Ethiopia',
		placeholder: 'Besrate Gebriel, Addis Ababa, Ethiopia',
		locale: 'en'
	},
	{
		key: 'location_office_address_am',
		label: 'Head office address (Amharic)',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: 'ብሥራተ ገብርኤል፣ አዲስ አበባ፣ ኢትዮጵያ',
		placeholder: 'ብሥራተ ገብርኤል፣ አዲስ አበባ፣ ኢትዮጵያ',
		locale: 'am'
	},
	{
		key: 'location_office_map_link',
		label: 'Head office directions link',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'url',
		description: 'Where the "open in Maps" arrow on the office card goes.',
		default: 'https://maps.app.goo.gl/nZwCjC4uNMCbV5eV7',
		placeholder: 'https://maps.app.goo.gl/…'
	},
	{
		key: 'location_office_map_embed',
		label: 'Head office map embed',
		group: 'Addresses & maps',
		screen: 'company',
		kind: 'url',
		description:
			'The map itself. The long ...&pb=... link is the one that pins the office marker at street level.',
		default:
			'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.0!2d38.67042494863281!3d9.014861600000009!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x164b8500410b9c13%3A0xabf29f54f3bb486b!2sDANA%20INDUSTRIAL%20EQUIPMENT%20SUPPLIER!5e0!3m2!1sen!2set!4v1787214479552!5m2!1sen!2set',
		placeholder: 'https://www.google.com/maps/embed?pb=…',
		pattern: /^https:\/\/(www\.)?google\.com\/maps/,
		patternMessage: 'Use the src from Google Maps → Share → Embed a map',
		multiline: true
	},
	{
		key: 'hours_weekday_en',
		label: 'Monday to Friday (English)',
		group: 'Opening hours',
		screen: 'company',
		kind: 'text',
		description: 'Shown in the opening hours card on the contact page.',
		default: '8:30 AM — 5:30 PM',
		placeholder: '8:30 AM — 5:30 PM',
		locale: 'en'
	},
	{
		key: 'hours_weekday_am',
		label: 'Monday to Friday (Amharic)',
		group: 'Opening hours',
		screen: 'company',
		kind: 'text',
		default: '8:30 ጠዋት — 5:30 ከሰዓት',
		description: 'Shown to visitors reading the site in Amharic.',
		placeholder: '8:30 ጠዋት — 5:30 ከሰዓት',
		locale: 'am'
	},
	{
		key: 'hours_saturday_en',
		label: 'Saturday (English)',
		group: 'Opening hours',
		screen: 'company',
		kind: 'text',
		description: 'Clear it and Saturday drops off the list, for a week you are closed.',
		default: '8:30 AM — 12:00 PM',
		placeholder: '8:30 AM — 12:00 PM',
		optional: true,
		locale: 'en'
	},
	{
		key: 'hours_saturday_am',
		label: 'Saturday (Amharic)',
		group: 'Opening hours',
		screen: 'company',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: '8:30 ጠዋት — 12:00 ቀትር',
		placeholder: '8:30 ጠዋት — 12:00 ቀትር',
		optional: true,
		locale: 'am'
	},
	{
		key: 'hours_note_en',
		label: 'Holiday notice (English)',
		group: 'Opening hours',
		screen: 'company',
		kind: 'text',
		description:
			'A short line under the hours, for closures. Blank by default, so nothing shows until you write something.',
		default: '',
		placeholder: 'Closed 7–9 January for Genna',
		optional: true,
		locale: 'en'
	},
	{
		key: 'hours_note_am',
		label: 'Holiday notice (Amharic)',
		group: 'Opening hours',
		screen: 'company',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: '',
		placeholder: 'ከጥር 7–9 ለገና ዝግ ነው',
		optional: true,
		locale: 'am'
	},
	{
		key: 'social_whatsapp',
		label: 'WhatsApp link',
		group: 'Social & chat',
		screen: 'company',
		kind: 'url',
		description: 'The green WhatsApp button in the header. Clear it to remove the button.',
		default: 'https://wa.me/251911245892',
		placeholder: 'https://wa.me/251911245892',
		optional: true
	},
	{
		key: 'social_telegram',
		label: 'Telegram link',
		group: 'Social & chat',
		screen: 'company',
		kind: 'url',
		description: 'The Telegram button in the header, and the Telegram tile on the contact page.',
		default: 'https://t.me/+251911245892',
		placeholder: 'https://t.me/+251911245892',
		optional: true
	},
	{
		key: 'social_facebook',
		label: 'Facebook page',
		group: 'Social & chat',
		screen: 'company',
		kind: 'url',
		description: 'Shown on the contact page. Clear it to drop the tile.',
		default: 'https://web.facebook.com/danaflash0901020304?_rdc=1&_rdr#',
		placeholder: 'https://facebook.com/…',
		optional: true
	},
	{
		key: 'social_instagram',
		label: 'Instagram profile',
		group: 'Social & chat',
		screen: 'company',
		kind: 'url',
		description: 'Shown on the contact page. Clear it to drop the tile.',
		default: 'https://www.instagram.com/dana_steel/',
		placeholder: 'https://instagram.com/…',
		optional: true
	},
	{
		key: 'social_tiktok',
		label: 'TikTok profile',
		group: 'Social & chat',
		screen: 'company',
		kind: 'url',
		description: 'Shown on the contact page. Clear it to drop the tile.',
		default: 'https://www.tiktok.com/@danasteel',
		placeholder: 'https://tiktok.com/@…',
		optional: true
	},

	// ---- Key figures -------------------------------------------------------
	// The four tiles on /about and the four on /factory. They are separate
	// fields even where two of them currently read the same, because the labels
	// beside them make different claims — /about's 100% is "quality standards",
	// /factory's is "batch inspection" — and tying them together would force one
	// to change when only the other should.
	{
		key: 'figure_about_product_lines',
		label: 'About: core product lines',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The number above “core product lines” on the About page.',
		default: '4',
		placeholder: '4'
	},
	{
		key: 'figure_about_quality',
		label: 'About: quality standards',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The figure above “quality standards” on the About page.',
		default: '100%',
		placeholder: '100%'
	},
	{
		key: 'figure_about_since',
		label: 'About: manufacturing since',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The year above “manufacturing since” on the About page.',
		default: '2023',
		placeholder: '2023'
	},
	{
		key: 'figure_about_market',
		label: 'About: market',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The short code above “Ethiopian infrastructure” on the About page.',
		default: 'ET',
		placeholder: 'ET'
	},
	{
		key: 'figure_factory_inspection',
		label: 'Factory: batch inspection',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The figure above “Batch inspection” on the Factory page.',
		default: '100%',
		placeholder: '100%'
	},
	{
		key: 'figure_factory_product_lines',
		label: 'Factory: core product lines',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The number above “Core product lines” on the Factory page.',
		default: '4',
		placeholder: '4'
	},
	{
		key: 'figure_factory_since',
		label: 'Factory: manufacturing since',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The year above “Manufacturing since” on the Factory page.',
		default: '2023',
		placeholder: '2023'
	},
	{
		key: 'figure_factory_city_en',
		label: 'Factory: city (English)',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'The place name above “Oromia, Ethiopia” on the Factory page.',
		default: 'Adama',
		placeholder: 'Adama',
		locale: 'en'
	},
	{
		key: 'figure_factory_city_am',
		label: 'Factory: city (Amharic)',
		group: 'Key figures',
		screen: 'content',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: 'አዳማ',
		placeholder: 'አዳማ',
		locale: 'am'
	},

	// ---- Homepage hero ------------------------------------------------------
	{
		key: 'hero_trust_count_en',
		label: 'Trust badge line (English)',
		group: 'Homepage hero',
		screen: 'content',
		kind: 'text',
		description: 'The bold line beside the customer avatars near the top of the homepage.',
		default: 'Builders · Contractors · Wholesalers',
		placeholder: 'Builders · Contractors · Wholesalers',
		locale: 'en'
	},
	{
		key: 'hero_trust_count_am',
		label: 'Trust badge line (Amharic)',
		group: 'Homepage hero',
		screen: 'content',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: 'ግንበኞች · ተቋራጮች · ጅምላ ነጋዴዎች',
		placeholder: 'ግንበኞች · ተቋራጮች · ጅምላ ነጋዴዎች',
		locale: 'am'
	},
	{
		key: 'hero_trust_sub_en',
		label: 'Trust badge subtitle (English)',
		group: 'Homepage hero',
		screen: 'content',
		kind: 'text',
		description: 'The smaller line underneath it.',
		default: 'Serving every type of customer since 2023',
		placeholder: 'Serving every type of customer since 2023',
		locale: 'en'
	},
	{
		key: 'hero_trust_sub_am',
		label: 'Trust badge subtitle (Amharic)',
		group: 'Homepage hero',
		screen: 'content',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: 'ከ2023 ዓ.ም ጀምሮ ሁሉንም ዓይነት ደንበኛ እናገለግላለን',
		placeholder: 'ከ2023 ዓ.ም ጀምሮ ሁሉንም ዓይነት ደንበኛ እናገለግላለን',
		locale: 'am'
	},

	// ---- Homepage video -----------------------------------------------------
	{
		key: 'home_video_url',
		label: 'Factory tour video',
		group: 'Homepage video',
		screen: 'content',
		kind: 'text',
		description:
			'Paste the link from the video’s address bar or its Share button. The still image behind the play button is set separately, under Site Images.',
		default: 'https://www.youtube.com/watch?v=Pds8-d8su7s',
		placeholder: 'https://www.youtube.com/watch?v=…',
		validate: (value) => youtubeId(value) !== null,
		patternMessage: 'That is not a YouTube video link. Copy the link from the video’s address bar or its Share button.'
	},

	// ---- Homepage call to action -------------------------------------------
	{
		key: 'cta_heading_en',
		label: 'Heading (English)',
		group: 'Homepage call to action',
		screen: 'content',
		kind: 'text',
		description: 'The large line in the band at the bottom of the homepage.',
		default: 'Ready to build with DANA STEEL FACTORY?',
		placeholder: 'Ready to build with DANA STEEL FACTORY?',
		locale: 'en'
	},
	{
		key: 'cta_heading_am',
		label: 'Heading (Amharic)',
		group: 'Homepage call to action',
		screen: 'content',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: 'ከዳና ስቲል ፋብሪካ ጋር ለመገንባት ዝግጁ ነዎት?',
		placeholder: 'ከዳና ስቲል ፋብሪካ ጋር ለመገንባት ዝግጁ ነዎት?',
		locale: 'am'
	},
	{
		key: 'cta_body_en',
		label: 'Supporting text (English)',
		group: 'Homepage call to action',
		screen: 'content',
		kind: 'text',
		description: 'The sentence under the heading. Two lines read best.',
		default:
			'Tell us your specifications and quantities — our team will come back with pricing, technical details and a delivery schedule.',
		placeholder: 'Tell us your specifications and quantities…',
		locale: 'en',
		multiline: true
	},
	{
		key: 'cta_body_am',
		label: 'Supporting text (Amharic)',
		group: 'Homepage call to action',
		screen: 'content',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default:
			'ልኬቶችዎንና መጠንዎን ይንገሩን — ቡድናችን ዋጋ፣ ቴክኒካዊ ዝርዝርና የማድረሻ ጊዜ ሰሌዳ ይዞ ይመለሳል።',
		placeholder: 'ልኬቶችዎንና መጠንዎን ይንገሩን…',
		locale: 'am',
		multiline: true
	},
	{
		key: 'cta_button_en',
		label: 'Button text (English)',
		group: 'Homepage call to action',
		screen: 'content',
		kind: 'text',
		description: 'Used on the homepage band and the two Contact buttons on the Factory page. Keep it short — it sits inside a pill.',
		default: 'Contact Us',
		placeholder: 'Contact Us',
		locale: 'en'
	},
	{
		key: 'cta_button_am',
		label: 'Button text (Amharic)',
		group: 'Homepage call to action',
		screen: 'content',
		kind: 'text',
		description: 'Shown to visitors reading the site in Amharic.',
		default: 'ያግኙን',
		placeholder: 'ያግኙን',
		locale: 'am'
	},

	// ---- RAL colours --------------------------------------------------------
	// The four swatches on the homepage colour band. Clearing a code drops that
	// swatch, so the band can show three or two instead of four.
	{
		key: 'ral_1_code',
		label: 'Swatch 1 — code',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'Clear the code to remove this swatch from the band.',
		default: 'RAL 3000',
		placeholder: 'RAL 3000',
		optional: true
	},
	{
		key: 'ral_1_color',
		label: 'Swatch 1 — colour',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'The paint colour, as a hex value.',
		default: '#E5342A',
		placeholder: '#E5342A',
		optional: true,
		pattern: /^#[0-9A-Fa-f]{6}$/,
		patternMessage: 'Use a six-digit hex colour, e.g. #E5342A'
	},
	{
		key: 'ral_2_code',
		label: 'Swatch 2 — code',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'Clear the code to remove this swatch from the band.',
		default: 'RAL 6002',
		placeholder: 'RAL 6002',
		optional: true
	},
	{
		key: 'ral_2_color',
		label: 'Swatch 2 — colour',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'The paint colour, as a hex value.',
		default: '#2C7D3E',
		placeholder: '#2C7D3E',
		optional: true,
		pattern: /^#[0-9A-Fa-f]{6}$/,
		patternMessage: 'Use a six-digit hex colour, e.g. #2C7D3E'
	},
	{
		key: 'ral_3_code',
		label: 'Swatch 3 — code',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'Clear the code to remove this swatch from the band.',
		default: 'RAL 5010',
		placeholder: 'RAL 5010',
		optional: true
	},
	{
		key: 'ral_3_color',
		label: 'Swatch 3 — colour',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'The paint colour, as a hex value.',
		default: '#1E52A8',
		placeholder: '#1E52A8',
		optional: true,
		pattern: /^#[0-9A-Fa-f]{6}$/,
		patternMessage: 'Use a six-digit hex colour, e.g. #1E52A8'
	},
	{
		key: 'ral_4_code',
		label: 'Swatch 4 — code',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'Clear the code to remove this swatch from the band.',
		default: 'RAL 1004',
		placeholder: 'RAL 1004',
		optional: true
	},
	{
		key: 'ral_4_color',
		label: 'Swatch 4 — colour',
		group: 'RAL colours',
		screen: 'content',
		kind: 'text',
		description: 'The paint colour, as a hex value.',
		default: '#D9A441',
		placeholder: '#D9A441',
		optional: true,
		pattern: /^#[0-9A-Fa-f]{6}$/,
		patternMessage: 'Use a six-digit hex colour, e.g. #D9A441'
	},

	// ---- Business settings --------------------------------------------------
	{
		key: 'finance_vat_rate',
		label: 'VAT rate (%)',
		group: 'Tax & pricing',
		screen: 'operations',
		kind: 'text',
		description:
			'Applied to the cart, checkout, order sheets, receipts and every emailed total. Changing it does not alter orders that were already priced.',
		default: '15',
		placeholder: '15',
		pattern: /^(100(\.0{1,2})?|\d{1,2}(\.\d{1,2})?)$/,
		patternMessage: 'Enter a percentage between 0 and 100, e.g. 15'
	},
	{
		key: 'alerts_recipient_email',
		label: 'Send order and quote alerts to',
		group: 'Alerts',
		screen: 'operations',
		kind: 'email',
		description:
			'Where "new order" and "new quote request" notifications go. Leave blank and they go to the mailbox the site sends from.',
		default: '',
		placeholder: 'sales@danasteel.com',
		optional: true
	},

];

export const SITE_SETTING_MAP: Record<string, SiteSettingField> = Object.fromEntries(
	SITE_SETTING_FIELDS.map((field) => [field.key, field])
);

export const SITE_SETTING_GROUPS: Record<SettingScreen, readonly SettingGroup[]> = {
	company: [
		'Phone numbers',
		'Email addresses',
		'Addresses & maps',
		'Opening hours',
		'Social & chat'
	],
	content: [
		'Homepage hero',
		'Homepage video',
		'Homepage call to action',
		'Key figures',
		'RAL colours'
	],
	operations: ['Tax & pricing', 'Alerts']
};

export const SCREEN_TITLES: Record<SettingScreen, string> = {
	company: 'Company Details',
	content: 'Page Text & Figures',
	operations: 'Business Settings'
};

export function fieldsForScreen(screen: SettingScreen): SiteSettingField[] {
	return SITE_SETTING_FIELDS.filter((field) => field.screen === screen);
}

/**
 * What the form actually renders. The registry entries carry a `pattern` and a
 * `validate` callback for the server-side schema, and a load cannot return a
 * function — so the screen hands the page this plain shape instead.
 */
export type SettingFieldView = {
	key: string;
	label: string;
	group: SettingGroup;
	description: string;
	default: string;
	placeholder: string;
	multiline: boolean;
};

export function fieldViewsForScreen(screen: SettingScreen): SettingFieldView[] {
	return fieldsForScreen(screen).map((field) => ({
		key: field.key,
		label: field.label,
		group: field.group,
		description: field.description,
		default: field.default,
		placeholder: field.placeholder,
		multiline: field.multiline ?? false
	}));
}

export type SiteSettingMap = Record<string, string>;

export type SiteSettingRow = { settingKey: string; settingValue: string };

export function defaultSiteSettings(): SiteSettingMap {
	return Object.fromEntries(SITE_SETTING_FIELDS.map((field) => [field.key, field.default]));
}

/**
 * A stored row always wins — including one holding '', which is how the
 * operator says "hide this". Only a missing key falls back to the default.
 */
export function resolveSiteSettings(rows: SiteSettingRow[]): SiteSettingMap {
	const resolved = defaultSiteSettings();
	for (const row of rows) {
		if (row.settingKey in resolved) resolved[row.settingKey] = row.settingValue;
	}
	return resolved;
}

/**
 * `tel:` wants the number without the spaces people read it with. A leading
 * `+` is kept because it is the only part that carries meaning abroad.
 */
export function telHref(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return '';
	const plus = trimmed.startsWith('+') ? '+' : '';
	const digits = trimmed.replace(/\D/g, '');
	return digits ? `tel:${plus}${digits}` : '';
}

/**
 * The storage key for one half of a translated pair: `hours_weekday` + 'am'
 * gives `hours_weekday_am`.
 */
export function localizedKey(base: string, locale: string): string {
	return `${base}_${locale}`;
}

/** The VAT rate to apply, from a resolved settings map. */
export function vatRateOf(settings: SiteSettingMap): number {
	return parseVatRate(settings['finance_vat_rate']);
}

export function mailHref(value: string): string {
	const trimmed = value.trim();
	return trimmed ? `mailto:${trimmed}` : '';
}
