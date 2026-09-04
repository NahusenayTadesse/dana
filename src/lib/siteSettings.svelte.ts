import { page } from '$app/state';
import { getLocale } from '$lib/paraglide/runtime';
import {
	SITE_SETTING_MAP,
	localizedKey,
	mailHref,
	telHref,
	type SiteSettingMap
} from './siteSettings';
import { parseVatRate } from './vat';

/**
 * Component-side accessors for the admin-managed company details.
 *
 * The resolved map is loaded once in the root layout, so any component can ask
 * for a field without prop-drilling. Read these inside `$derived` (or straight
 * in markup) and the value swaps over on navigation like any other page data.
 *
 * They fall back to the registry default if layout data isn't there yet, so a
 * component can never render an empty phone number by accident.
 */
function resolved(): SiteSettingMap {
	return (page.data?.siteSettings ?? {}) as SiteSettingMap;
}

/** The value for a key — '' when the operator has cleared an optional field. */
export function siteSetting(key: string): string {
	const found = resolved()[key];
	return found ?? SITE_SETTING_MAP[key]?.default ?? '';
}

/**
 * One half of a translated pair, picked by the visitor's language. Falls back
 * to English so a client who has only filled in one side still shows something
 * rather than a blank address.
 */
export function siteSettingText(base: string): string {
	const locale = getLocale();
	const own = siteSetting(localizedKey(base, locale));
	return own || siteSetting(localizedKey(base, 'en'));
}

/** The VAT rate currently in force, for anything rendering money. */
export function siteVatRate(): number {
	return parseVatRate(siteSetting('finance_vat_rate'));
}

/** A ready `tel:` href, or '' when the number is cleared. */
export function sitePhoneHref(key: string): string {
	return telHref(siteSetting(key));
}

/** A ready `mailto:` href, or '' when the address is cleared. */
export function siteEmailHref(key: string): string {
	return mailHref(siteSetting(key));
}
