/**
 * The finished-building renders under /static/showcase/gallery, one folder per
 * product + colour. Every photo ships in two widths (`-640` and `-1280`), cut
 * from the original renders and re-encoded as WebP, so nothing here costs more
 * than ~150 KB and most cards fetch the ~60 KB version.
 *
 * Width/height are the real pixel size of the photo; they go straight onto the
 * <img> so the browser reserves the space and the grid never jumps as images
 * arrive.
 */

export type ShowcaseKind = 'roof' | 'fence';

export type ShowcaseColor =
	| 'black'
	| 'brown'
	| 'terracotta'
	| 'red'
	| 'blue'
	| 'lightblue'
	| 'green'
	| 'white';

export type ShowcaseSet = {
	slug: string;
	kind: ShowcaseKind;
	color: ShowcaseColor;
	swatch: string;
};

export type ShowcasePhoto = ShowcaseSet & {
	/** 1280px-wide (or native, if smaller) — lightbox and large layouts. */
	large: string;
	/** 640px-wide — cards and thumbnails. */
	small: string;
	srcset: string;
	width: number;
	height: number;
};

const BASE = '/showcase/gallery';

/** [file, width, height]; listed in the order each set should be shown. */
type Entry = [string, number, number];

const SETS: (ShowcaseSet & { photos: Entry[] })[] = [
	{
		slug: 'roof-red',
		kind: 'roof',
		color: 'red',
		swatch: '#C8231F',
		photos: [
			['02', 1532, 1361],
			['01', 1082, 1434],
			['03', 1500, 1361],
			['04', 1500, 1361],
			['05', 1404, 1378],
			['06', 1532, 1378],
			['07', 1320, 1378]
		]
	},
	{
		slug: 'roof-blue',
		kind: 'roof',
		color: 'blue',
		swatch: '#1F5BD8',
		photos: [
			['02', 1532, 1367],
			['01', 1532, 1010],
			['03', 1502, 1367],
			['04', 1509, 1367],
			['05', 1432, 1384],
			['06', 1532, 1384],
			['07', 1323, 1384]
		]
	},
	{
		slug: 'fence-red',
		kind: 'fence',
		color: 'red',
		swatch: '#D2261F',
		photos: [
			['01', 1444, 1072],
			['02', 1444, 1072],
			['03', 1444, 1072],
			['04', 1444, 1072],
			['05', 1444, 1072],
			['06', 1444, 1072]
		]
	},
	{
		slug: 'roof-green',
		kind: 'roof',
		color: 'green',
		swatch: '#1F5F4B',
		photos: [
			['01', 1020, 1522],
			['02', 1532, 1364],
			['03', 1527, 1364],
			['04', 1398, 1378],
			['05', 1532, 1378],
			['06', 1362, 1378]
		]
	},
	{
		slug: 'roof-black',
		kind: 'roof',
		color: 'black',
		swatch: '#2B2B2E',
		photos: [
			['01', 1532, 1506],
			['06', 1532, 1010],
			['03', 1438, 1528],
			['04', 1532, 1543],
			['05', 1275, 1525],
			['02', 1532, 1503],
			['07', 1532, 1010],
			['08', 1294, 1378],
			['09', 1118, 1388],
			['10', 1118, 1388],
			['11', 1118, 1388],
			['12', 1532, 1010],
			['13', 1118, 1388]
		]
	},
	{
		slug: 'fence-blue',
		kind: 'fence',
		color: 'blue',
		swatch: '#2148C9',
		photos: [
			['02', 1444, 1072],
			['01', 1444, 1072],
			['03', 1444, 1072],
			['04', 1444, 1072],
			['05', 1444, 1072],
			['06', 1444, 1072],
			['07', 1444, 1072],
			['08', 1444, 1072]
		]
	},
	{
		slug: 'roof-terracotta',
		kind: 'roof',
		color: 'terracotta',
		swatch: '#B4542D',
		photos: [
			['02', 1444, 1072],
			['03', 1444, 1072],
			['04', 1444, 1072],
			['05', 1444, 1072],
			['06', 1444, 1072],
			['07', 1444, 1072],
			['01', 1532, 1010]
		]
	},
	{
		slug: 'roof-lightblue',
		kind: 'roof',
		color: 'lightblue',
		swatch: '#4A6E9C',
		photos: [
			['02', 1532, 1364],
			['01', 1020, 1522],
			['03', 1489, 1364],
			['04', 1514, 1364],
			['05', 1406, 1378],
			['06', 1532, 1378],
			['07', 1310, 1378]
		]
	},
	{
		slug: 'fence-white',
		kind: 'fence',
		color: 'white',
		swatch: '#ECEEF1',
		photos: [
			['01', 1444, 1072],
			['03', 1444, 1072],
			['02', 1444, 1072],
			['04', 1444, 1072],
			['05', 1444, 1072],
			['06', 1444, 1072]
		]
	},
	{
		slug: 'roof-brown',
		kind: 'roof',
		color: 'brown',
		swatch: '#45322E',
		photos: [
			['02', 1532, 1361],
			['01', 1082, 1434],
			['03', 1449, 1362],
			['04', 1532, 1361],
			['05', 1341, 1378],
			['06', 1532, 1378]
		]
	}
];

function photo(set: ShowcaseSet, [file, w, h]: Entry): ShowcasePhoto {
	const small = `${BASE}/${set.slug}/${file}-640.webp`;
	const large = `${BASE}/${set.slug}/${file}-1280.webp`;
	const largeWidth = Math.min(w, 1280);
	const height = Math.round((h * largeWidth) / w);
	return {
		...set,
		small,
		large,
		srcset: `${small} 640w, ${large} ${largeWidth}w`,
		width: largeWidth,
		height
	};
}

/** One entry per product + colour, in display order. */
export const SHOWCASE_SETS: ShowcaseSet[] = SETS.map(({ photos: _photos, ...set }) => set);

/**
 * Every photo, dealt round-robin across the sets so any prefix of the list —
 * the first dozen on the homepage, say — mixes colours and products rather
 * than showing thirteen black roofs in a row.
 */
export const SHOWCASE_PHOTOS: ShowcasePhoto[] = (() => {
	const out: ShowcasePhoto[] = [];
	const longest = Math.max(...SETS.map((s) => s.photos.length));
	for (let i = 0; i < longest; i++) {
		for (const set of SETS) {
			const entry = set.photos[i];
			if (entry) out.push(photo(set, entry));
		}
	}
	return out;
})();

/** Path of one photo at 1280px, for site-image slot defaults. */
export const showcasePath = (slug: string, file: string) => `${BASE}/${slug}/${file}-1280.webp`;

/**
 * `srcset` for a URL that points at one of our bundled showcase photos, so a
 * slot left on its default still gets the small file on phones. An admin's
 * own upload has no smaller sibling, so it gets `undefined` and loads as-is.
 */
export function showcaseSrcset(url: string): string | undefined {
	if (!/^\/showcase\/gallery\/.+-1280\.webp$/.test(url)) return undefined;
	return `${url.replace(/-1280\.webp$/, '-640.webp')} 640w, ${url} 1280w`;
}

/** The 640px sibling of a bundled showcase photo; any other URL as-is. */
export function showcaseSmall(url: string): string {
	return /^\/showcase\/gallery\/.+-1280\.webp$/.test(url) ? url.replace(/-1280\.webp$/, '-640.webp') : url;
}
