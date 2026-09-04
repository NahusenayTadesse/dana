import { db } from '$lib/server/db';
import { siteSettings } from '$lib/server/db/schema';
import { resolveSiteSettings, type SiteSettingMap } from '$lib/siteSettings';

/**
 * The resolved company details, for server code that runs outside a page load
 * and so cannot read `page.data` — the chat API building its system prompt,
 * for instance.
 */
export async function getSiteSettings(): Promise<SiteSettingMap> {
	const rows = await db
		.select({ settingKey: siteSettings.settingKey, settingValue: siteSettings.settingValue })
		.from(siteSettings);

	return resolveSiteSettings(rows);
}
