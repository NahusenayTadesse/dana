/**
 * Registry of every image on the public-facing site that an admin can replace
 * from the dashboard (/dashboard/site-images).
 *
 * Each entry is a "slot": a stable key, the static asset it ships with, and
 * whether it holds one image or an ordered gallery. Rows in the `site_images`
 * table override a slot; a slot with no rows renders its bundled defaults, so
 * a fresh database looks exactly like the site did before it had one.
 *
 * Adding a new editable image = add a slot here + read it in the component.
 * Nothing else needs to change: the dashboard table is generated from this
 * list.
 */

import { assetUrl } from './utils';

export type SiteImageSlotKind = 'single' | 'gallery';

export type SiteImageSlot = {
	/** Stable key. Stored in site_images.slot — don't rename without a migration. */
	key: string;
	/** Human label shown in the dashboard table. */
	label: string;
	/** Grouping in the dashboard table. */
	section: string;
	/** Where it shows up, for the "View" link in the dashboard. */
	page: string;
	kind: SiteImageSlotKind;
	/** What this image is and where exactly it appears. */
	description: string;
	/** Bundled static paths used until an admin uploads a replacement. */
	defaults: string[];
	/** Advisory only — shown in the dashboard so uploads are the right shape. */
	recommended?: string;
	/** Gallery slots only: soft cap surfaced in the UI. */
	maxCount?: number;
};

export const SITE_IMAGE_SECTIONS = ['Global', 'Home', 'About', 'Factory'] as const;

export const SITE_IMAGE_SLOTS: SiteImageSlot[] = [
	/* ------------------------------------------------------------------ Global */
	{
		key: 'global.logo',
		label: 'Site logo',
		section: 'Global',
		page: '/',
		kind: 'single',
		description:
			'Header, footer and printed order receipts. Sits on a white chip, so a transparent PNG works best.',
		defaults: ['/logo.png'],
		recommended: 'Transparent PNG/WEBP, ~400×120'
	},
	{
		key: 'global.favicon',
		label: 'Browser tab icon',
		section: 'Global',
		page: '/',
		kind: 'single',
		description:
			'The favicon shown in the browser tab and when the site is saved to a phone home screen.',
		defaults: ['/logo192.png'],
		recommended: 'Square PNG, 192×192'
	},

	/* -------------------------------------------------------------------- Home */
	{
		key: 'home.hero.slides',
		label: 'Hero slideshow',
		section: 'Home',
		page: '/',
		kind: 'gallery',
		description: 'The photos that crossfade inside the blue hero card at the top of the homepage.',
		defaults: [
			'/images/front desk.webp',
			'/images/manufacture.webp',
			'/images/products show.webp',
			'/images/working.webp',
			'/images/manufacture top view.webp'
		],
		recommended: 'Square-ish, 1200×1200 or larger',
		maxCount: 8
	},
	{
		key: 'home.video.poster',
		label: 'Video cover image',
		section: 'Home',
		page: '/',
		kind: 'single',
		description: 'Still shown over the factory video before someone presses play.',
		defaults: ['/images/manufacture top view.webp'],
		recommended: '16:9, 1920×1080'
	},
	{
		key: 'home.about.primary',
		label: 'About section — main photo',
		section: 'Home',
		page: '/',
		kind: 'single',
		description: 'Large photo beside the "about us" copy on the homepage.',
		defaults: ['/images/manufacture.webp'],
		recommended: '4:3, 1600×1200'
	},
	{
		key: 'home.about.secondary',
		label: 'About section — small photo',
		section: 'Home',
		page: '/',
		kind: 'single',
		description: 'Smaller photo under the main one, next to the facts card.',
		defaults: ['/assets/factory-gate.jpg'],
		recommended: 'Portrait-ish, 800×900'
	},
	{
		key: 'home.ral.image',
		label: 'RAL colours band photo',
		section: 'Home',
		page: '/',
		kind: 'single',
		description: 'Photo inside the dark navy RAL colour-range band.',
		defaults: ['/images/manufacture.webp'],
		recommended: '4:3, 1200×900'
	},
	{
		key: 'home.factory_band.background',
		label: 'Factory band background',
		section: 'Home',
		page: '/',
		kind: 'single',
		description: 'Full-width background photo behind the factory statistics band.',
		defaults: ['/assets/factory-gate.jpg'],
		recommended: 'Wide, 2000×900 — keep the left third uncluttered, text sits there'
	},

	/* ------------------------------------------------------------------- About */
	{
		key: 'about.highlights',
		label: 'Highlight strip (3 photos)',
		section: 'About',
		page: '/about',
		kind: 'gallery',
		description: 'The row of three small photos inside the "why work with us" card.',
		defaults: ['/images/front desk.webp', '/images/working.webp', '/images/portolio 1.webp'],
		recommended: 'Landscape, 600×400',
		maxCount: 3
	},
	{
		key: 'about.product_feature',
		label: 'Product feature photo',
		section: 'About',
		page: '/about',
		kind: 'single',
		description: 'Tall photo beside the product quality checklist.',
		defaults: ['/images/products show.webp'],
		recommended: 'Portrait, 900×1200'
	},
	{
		key: 'about.manufacturing.grid',
		label: 'Manufacturing grid (4 photos)',
		section: 'About',
		page: '/about',
		kind: 'gallery',
		description:
			'The four-tile facility grid. Order matters: 1 is the wide hero tile, 2 the tall tile, 3 and 4 the bottom pair.',
		defaults: [
			'/images/manufacture top view.webp',
			'/images/manufacture.webp',
			'/images/welcome.webp',
			'/images/client.webp'
		],
		recommended: 'Landscape, 1200×800',
		maxCount: 4
	},
	{
		key: 'about.product_slider',
		label: 'Product categories slider',
		section: 'About',
		page: '/about',
		kind: 'gallery',
		description: 'Photos stepped through with the arrows in the product categories section.',
		defaults: [
			'/images/products show.webp',
			'/images/products show1.webp',
			'/images/products show2.webp',
			'/images/products show3.webp',
			'/images/products list.webp',
			'/images/products list1.webp'
		],
		recommended: 'Landscape, 1200×700',
		maxCount: 12
	},
	{
		key: 'about.team_gallery',
		label: 'Facility & team gallery',
		section: 'About',
		page: '/about',
		kind: 'gallery',
		description: 'The large clickable photo grid with the lightbox, further down the about page.',
		defaults: [
			'/assets/1.webp',
			'/assets/2.webp',
			'/assets/4.webp',
			'/assets/5.webp',
			'/assets/8.webp',
			'/assets/11.webp',
			'/assets/12.webp',
			'/assets/14.webp',
			'/assets/15.webp',
			'/assets/18.webp',
			'/assets/19.webp',
			'/assets/77.webp',
			'/assets/products show4.webp',
			'/assets/factory-gate.jpg',
			'/assets/forklift.jpg',
			'/assets/reception.jpg',
			'/assets/rollforming.jpg',
			'/assets/showroom.jpg',
			'/assets/slitting-line.jpg',
			'/assets/warehouse.jpg',
			'/assets/image1.jpg',
			'/assets/image2.jpg',
			'/assets/image5.jpg',
			'/assets/image7.jpg',
			'/assets/image8.jpg',
			'/assets/image9.jpg',
			'/assets/image10.jpg'
		],
		recommended: 'Any orientation, 1200px on the long edge'
	},

	/* ----------------------------------------------------------------- Factory */
	{
		key: 'factory.machines',
		label: 'Machine line-up (5 photos)',
		section: 'Factory',
		page: '/factory',
		kind: 'gallery',
		description:
			'Photos for the five machine tiles. Order matters — each position keeps its existing caption, and the first one is the tall tile.',
		defaults: [
			'/assets/rollforming.jpg',
			'/assets/slitting-line.jpg',
			'/assets/image2.jpg',
			'/assets/showroom.jpg',
			'/assets/factory-gate.jpg'
		],
		recommended: 'Landscape, 1200×900',
		maxCount: 5
	},
	{
		key: 'factory.panorama',
		label: 'Draggable panorama',
		section: 'Factory',
		page: '/factory',
		kind: 'single',
		description:
			'The wide warehouse shot visitors drag sideways. Needs to be much wider than tall.',
		defaults: ['/assets/warehouse.jpg'],
		recommended: 'Very wide, 3000×1000 or wider'
	},
	{
		key: 'factory.products.photo',
		label: 'Product lines photo',
		section: 'Factory',
		page: '/factory',
		kind: 'single',
		description: 'Photo beside the specification note at the end of the product lines section.',
		defaults: ['/assets/image9.jpg'],
		recommended: 'Landscape, 1200×800'
	}
];

export const SITE_IMAGE_SLOT_MAP: Record<string, SiteImageSlot> = Object.fromEntries(
	SITE_IMAGE_SLOTS.map((slot) => [slot.key, slot])
);

/** Resolved slot key -> ordered list of ready-to-use URLs. */
export type SiteImageMap = Record<string, string[]>;

/** A row as stored in the `site_images` table (only the parts we need). */
export type SiteImageRow = { slot: string; imageUrl: string; sortOrder?: number | null };

/** Re-exported so slot consumers don't need a second import. */
export { assetUrl as toImageUrl } from './utils';

/**
 * Build the full slot -> URLs map: DB rows where they exist, bundled defaults
 * everywhere else. Every registered slot is always present, so callers never
 * have to null-check.
 */
export function resolveSiteImages(rows: SiteImageRow[]): SiteImageMap {
	const bySlot = new Map<string, SiteImageRow[]>();
	for (const row of rows) {
		if (!row?.imageUrl) continue;
		const list = bySlot.get(row.slot);
		if (list) list.push(row);
		else bySlot.set(row.slot, [row]);
	}

	const map: SiteImageMap = {};
	for (const slot of SITE_IMAGE_SLOTS) {
		const stored = bySlot.get(slot.key);
		const source = stored?.length
			? [...stored]
					.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
					.map((row) => row.imageUrl)
			: slot.defaults;

		const urls = source.map(assetUrl).filter(Boolean);
		map[slot.key] = urls.length ? urls : slot.defaults.map(assetUrl);
	}
	return map;
}

/** Defaults-only map, for any render path that runs without layout data. */
export function defaultSiteImages(): SiteImageMap {
	return resolveSiteImages([]);
}
