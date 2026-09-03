import type { SiteImageSlotKind } from '$lib/siteImages';

/** One row of the site-images table: a registry slot plus its current state. */
export type SlotRow = {
	key: string;
	label: string;
	section: string;
	page: string;
	kind: SiteImageSlotKind;
	description: string;
	recommended: string;
	maxCount: number | null;
	defaults: string[];
	/** True once an admin has overridden the bundled defaults. */
	isCustom: boolean;
	/** Raw stored values in display order — upload names or bundled paths. */
	values: string[];
};
