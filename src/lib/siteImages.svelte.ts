import { page } from '$app/state';
import { SITE_IMAGE_SLOT_MAP, toImageUrl, type SiteImageMap } from './siteImages';

/**
 * Component-side accessors for the admin-managed site imagery.
 *
 * The resolved map is loaded once in the root layout, so any component can ask
 * for a slot without prop-drilling. Read these inside `$derived` (or straight
 * in markup) and the image swaps over on navigation like any other page data.
 *
 * They fall back to the registry defaults if layout data isn't there yet, so a
 * component can never render a broken `src`.
 */
function resolved(): SiteImageMap {
	return (page.data?.siteImages ?? {}) as SiteImageMap;
}

function defaultsFor(key: string): string[] {
	return (SITE_IMAGE_SLOT_MAP[key]?.defaults ?? []).map(toImageUrl);
}

/** All images for a gallery slot, in admin-defined order. */
export function siteImages(key: string): string[] {
	const found = resolved()[key];
	return found?.length ? found : defaultsFor(key);
}

/**
 * One image from a slot. `index` picks a position out of a gallery slot and
 * falls back to the first image, so a grid that expects four photos still
 * renders when an admin has uploaded three.
 */
export function siteImage(key: string, index = 0): string {
	const list = siteImages(key);
	return list[index] ?? list[0] ?? '';
}
