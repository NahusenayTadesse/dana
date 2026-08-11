import type { CartItem } from '$lib/hooks/cart.svelte.js';

/**
 * Cart lines that are the same product in the same colour/width/thickness
 * belong together — they differ only in length and quantity, which is what each
 * block lists. Length is deliberately NOT part of this key (that's the axis a
 * block varies along); it is part of cartLineKey, which is what keeps them
 * separate lines in the first place.
 */
const groupKey = (i: CartItem) => [i.productId, i.colorId, i.width, i.thickness].join('|');

/**
 * A, B, … Z, AA, AB — spreadsheet-style, so a long order doesn't run out of
 * letters or start showing symbols.
 */
export function groupLetter(index: number): string {
	let out = '';
	let n = index;
	do {
		out = String.fromCharCode(65 + (n % 26)) + out;
		n = Math.floor(n / 26) - 1;
	} while (n >= 0);
	return out;
}

export type CartGroup = { key: string; letter: string; items: CartItem[] };

/**
 * Groups appear in the order their first line was added, and rows inside a
 * group run shortest length first — a new row lands in a predictable place
 * instead of wherever the cart array happened to put it.
 *
 * Shared by /buy and /checkout so the order a customer builds is the same order
 * they confirm, block letters and row refs included: "B2" has to mean the same
 * line on both pages, because it's what they'll quote down the phone.
 */
export function groupCartItems(items: CartItem[]): CartGroup[] {
	const out: CartGroup[] = [];

	for (const item of items) {
		const key = groupKey(item);
		const existing = out.find((g) => g.key === key);
		if (existing) existing.items.push(item);
		else out.push({ key, letter: '', items: [item] });
	}

	return out.map((g, i) => ({
		...g,
		letter: groupLetter(i),
		items: [...g.items].sort((a, b) => (a.length ?? 0) - (b.length ?? 0))
	}));
}
