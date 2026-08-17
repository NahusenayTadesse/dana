import { setContext, getContext } from 'svelte';
import { grossOf, netOf, round2, vatOf } from '$lib/vat';

// A cart line is anchored to a specific productVariant — that's the atomic
// sellable unit (a fixed color+width+thickness+length combo with its own
// price/sku). Fields below mirror orderItems' spec columns directly so the
// cart, checkout, and the order it produces stay in the same shape end to
// end — no more collapsing the spec into an opaque display string.
//
// A variantId alone is NOT the line's identity though: a line's length can be
// dialled off-catalog after it was added (see updateLength, for products with
// products.isLengthCustomizable), so one variant can legitimately appear as
// several lines — 3 sheets at 2m and 2 sheets at 3.5m are two things the
// customer wants, not one line of 5. Colour is folded into the same key so a
// colour swap that lands on a variant already in the cart still merges. See
// cartLineKey below; `lineId` is the stable handle every mutation takes.
export type CartItem = {
	/**
	 * Stable per-line handle, assigned on add and never reused. Deliberately
	 * independent of the spec: editing a line's length changes what it merges
	 * with, but must not change its identity mid-edit — that would remount the
	 * row and drop focus out of the input being typed in.
	 */
	lineId: string;
	variantId: number;
	productId: number;
	productName: string;
	sku: string | null;
	// Nullable on purpose: a quote-only variant has no listed price, and the DB
	// hands these back as `string | null` (decimal columns), so declaring a bare
	// `number` here made the guard in addItem look unreachable to TS while a
	// real string value sailed straight through it into the totals.
	price: number | null;
	priceIncludesVat: boolean;
	colorId: number | null;
	colorName: string | null;
	width: number | null;
	widthUnit: 'mm' | 'cm' | 'm' | 'in' | 'ft' | null;
	thickness: number | null;
	thicknessUnit: 'mm' | 'gauge' | null;
	length: number | null;
	lengthUnit: 'mm' | 'm' | 'ft' | null;
	isCustomLength?: boolean;
	// Human-readable spec summary for display, e.g. "Signal Red · 1000mm · 0.45mm"
	specLabel: string;
	imageUrl?: string | null;
	quantity: number;
};

const CART_STORAGE_KEY = 'dana';

/** The spec fields that decide whether two lines are the same order item. */
export type CartLineSpec = Pick<
	CartItem,
	'variantId' | 'colorId' | 'length' | 'lengthUnit' | 'isCustomLength'
>;

/**
 * Identity of a cart line: same variant AND same colour AND same requested
 * length. "2m in Signal Red" and "3.5m in Signal Red" are two different order
 * items, as are two colours of the same size.
 *
 * Two lines sharing a key are the same thing ordered twice. Adding from a
 * product card folds them together (addItem) — pressing the same button twice
 * plainly means "one more". Editing an existing line does not: there the pair
 * is flagged in the order and the customer chooses (see mergeLines).
 *
 * Length is normalised through Number() so a stored "2" and a typed 2 don't
 * read as different lines.
 */
export function cartLineKey(item: CartLineSpec): string {
	const length = item.length == null ? '' : String(Number(item.length));
	return [
		item.variantId,
		item.colorId ?? '',
		length,
		item.lengthUnit ?? '',
		item.isCustomLength ? 'custom' : 'catalog'
	].join('|');
}

let lineCounter = 0;

function newLineId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	return `line-${++lineCounter}-${performance.now().toString(36)}`;
}

/**
 * Hand every stored line a unique lineId, since a cart written by an older
 * build has none at all and a hand-edited one can repeat them.
 *
 * Two lines with the same spec are deliberately left as two lines: the customer
 * is the one who decides whether that was a mistake (the order row offers them
 * "merge" and "delete"), so a reload must not quietly make that decision for
 * them by collapsing the pair.
 */
function normalizeStoredItems(items: CartItem[]): CartItem[] {
	// Plain array scans rather than a Map/Set: a cart holds a handful of lines,
	// and svelte/prefer-svelte-reactivity flags built-in collections here.
	const out: CartItem[] = [];

	for (const item of items) {
		const lineId =
			typeof item.lineId === 'string' && item.lineId && !out.some((i) => i.lineId === item.lineId)
				? item.lineId
				: newLineId();
		out.push({ ...item, lineId, quantity: item.quantity ?? 1 });
	}

	return out;
}

class UseCart {
	items: CartItem[] = $state([]);
	isOpen: boolean = $state(false);

	/** Total items count */
	totalItems = $derived(this.items.reduce((sum, item) => sum + item.quantity, 0));

	// Totals are VAT-aware. A cart can hold a mix of VAT-inclusive and
	// VAT-exclusive rates (see CartItem.priceIncludesVat), and the old
	// `totalPrice` summed price × quantity across both — a number that was
	// neither the net nor the gross figure and matched nothing the server
	// later computed.

	/** VAT-exclusive total. */
	subtotalExclVat = $derived(
		round2(
			this.items.reduce(
				(sum, item) => sum + netOf(Number(item.price), item.priceIncludesVat) * item.quantity,
				0
			)
		)
	);

	/** VAT component across the cart. */
	vatTotal = $derived(
		round2(
			this.items.reduce(
				(sum, item) => sum + vatOf(Number(item.price), item.priceIncludesVat) * item.quantity,
				0
			)
		)
	);

	/** VAT-inclusive total — what the customer actually pays. */
	totalPrice = $derived(
		round2(
			this.items.reduce(
				(sum, item) => sum + grossOf(Number(item.price), item.priceIncludesVat) * item.quantity,
				0
			)
		)
	);

	constructor() {
		this.loadFromStorage();

		$effect(() => {
			this.saveToStorage();
		});
	}

	private loadFromStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			const stored = localStorage.getItem(CART_STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				// Old carts were keyed by productId+amount and have no variantId —
				// that shape is incompatible with the new variant-based model, so
				// discard rather than risk mismatched items/prices.
				const isValidShape =
					Array.isArray(parsed) && parsed.every((i) => typeof i?.variantId === 'number');

				if (isValidShape) {
					// Every list iterates with `{#each cart.items as item (item.lineId)}`.
					// A stored cart holding two lines with the same lineId therefore
					// throws Svelte's `each_key_duplicate` on mount and takes the
					// whole page down, with no way for the user to recover short of
					// clearing site data. Normal use can't produce one — but a cart
					// written by an older build (no lineId at all), or hand-edited,
					// can.
					this.items = normalizeStoredItems(parsed);
				} else if (Array.isArray(parsed) && parsed.length > 0) {
					console.warn('Discarding incompatible cart from a previous version.');
					localStorage.removeItem(CART_STORAGE_KEY);
				}
			}
		} catch (e) {
			console.error('Failed to load cart from localStorage:', e);
		}
	};

	private saveToStorage = () => {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(this.items));
		} catch (e) {
			console.error('Failed to save cart to localStorage:', e);
		}
	};

	toggle = () => (this.isOpen = !this.isOpen);
	open = () => (this.isOpen = true);
	close = () => (this.isOpen = false);

	/** The line holding an exact variant+colour+length combination, if any. */
	findLine = (spec: CartLineSpec): CartItem | undefined => {
		const key = cartLineKey(spec);
		return this.items.find((i) => cartLineKey(i) === key);
	};

	/**
	 * How many units of an exact spec are in the cart — what an "in cart" badge
	 * on a product card should show for the combination it currently has
	 * selected. Summed across lines: the same spec can sit on more than one line
	 * (the customer is free to keep two and merge them later), and a badge that
	 * read only the first one would under-report what is on the order.
	 */
	quantityOf = (spec: CartLineSpec): number => {
		const key = cartLineKey(spec);
		return this.items.reduce((sum, i) => (cartLineKey(i) === key ? sum + i.quantity : sum), 0);
	};

	/** Total units of a variant across every length/colour line it appears in. */
	quantityOfVariant = (variantId: number): number =>
		this.items.reduce((sum, i) => (i.variantId === variantId ? sum + i.quantity : sum), 0);

	/**
	 * Add item to cart. Merges into an existing line only when the variant,
	 * colour AND requested length all match — a different length (or colour) of
	 * the same variant becomes its own line, because it's its own order item.
	 */
	addItem = (item: Omit<CartItem, 'quantity' | 'lineId'>, quantity: number = 1) => {
		if (item.price == null || Number.isNaN(Number(item.price))) {
			console.error('Refusing to add a quote-only variant (no price) to the cart:', item);
			return;
		}

		const key = cartLineKey(item);
		const existingIndex = this.items.findIndex((i) => cartLineKey(i) === key);

		if (existingIndex >= 0) {
			this.items[existingIndex].quantity += quantity;
		} else {
			this.items.push({ ...item, lineId: newLineId(), quantity });
		}
	};

	/**
	 * Put a whole cart back exactly as it was — for "undo" after Start over.
	 * Restores line for line, duplicates included, rather than replaying adds
	 * through addItem(), which would merge same-spec lines back together and
	 * hand the customer back a different order than the one they cleared.
	 */
	restoreItems = (items: CartItem[]) => {
		this.items = normalizeStoredItems(items);
	};

	/**
	 * Start a second line from an existing one — the customer asking for "another
	 * one of these" before they have said what is different about it. It lands
	 * directly under its source at quantity 1 and is a full line of its own, so
	 * length, colour and quantity can all be dialled from there.
	 *
	 * Deliberately NOT routed through addItem: an identical copy is the whole
	 * point (the customer decides what to change, or whether to merge it back),
	 * and addItem would fold it straight into the line it came from.
	 */
	duplicateLine = (lineId: string): string | null => {
		const index = this.items.findIndex((i) => i.lineId === lineId);
		if (index < 0) return null;

		const newId = newLineId();
		this.items.splice(index + 1, 0, { ...this.items[index], lineId: newId, quantity: 1 });
		return newId;
	};

	/**
	 * Fold one line into another, summing quantities — the "these two are the
	 * same thing" resolution, taken only when the customer presses for it. Two
	 * identical lines are never merged automatically: 3 at 1m and 2 at 1m may
	 * well be two deliveries, two sites or two customers, and only the person
	 * placing the order knows which.
	 */
	mergeLines = (fromLineId: string, intoLineId: string) => {
		const from = this.items.findIndex((i) => i.lineId === fromLineId);
		const into = this.items.findIndex((i) => i.lineId === intoLineId);
		if (from < 0 || into < 0 || from === into) return;

		this.items[into].quantity += this.items[from].quantity;
		this.items.splice(from, 1);
	};

	/** Remove one line from the cart. */
	removeItem = (lineId: string) => {
		this.items = this.items.filter((item) => item.lineId !== lineId);
	};

	/** Update quantity for one line. */
	updateQuantity = (lineId: string, quantity: number) => {
		if (quantity <= 0) {
			this.removeItem(lineId);
			return;
		}

		const index = this.items.findIndex((i) => i.lineId === lineId);

		if (index >= 0) {
			this.items[index].quantity = quantity;
		}
	};

	/**
	 * Swap a line to a different variant of the same product (e.g. a color or
	 * length change) while keeping its quantity, its lineId and its position in
	 * the list. Landing on a spec another line already holds leaves both lines
	 * standing — the order row flags the pair and offers to merge them, which is
	 * the customer's call to make, not an edit's side effect.
	 */
	updateVariant = (lineId: string, newVariant: Omit<CartItem, 'quantity' | 'lineId'>) => {
		const index = this.items.findIndex((i) => i.lineId === lineId);
		if (index < 0) return;

		const { quantity } = this.items[index];
		this.items[index] = { ...newVariant, lineId, quantity };
	};

	/**
	 * Dial a line's length in place, for products where length isn't limited
	 * to fixed catalog stops (products.isLengthCustomizable) — same variant,
	 * same price, just a different requested length. Dialling one line onto
	 * another's length is left as two lines, flagged for the customer to merge
	 * or delete; see mergeLines.
	 */
	updateLength = (lineId: string, length: number, isCustomLength: boolean, specLabel?: string) => {
		const index = this.items.findIndex((i) => i.lineId === lineId);
		if (index < 0) return;

		this.items[index].length = length;
		this.items[index].isCustomLength = isCustomLength;
		// The label is what reaches staff as orderItems.amount — leaving the old
		// one behind would have them cut the length the line started at.
		if (specLabel) this.items[index].specLabel = specLabel;
	};

	clearCart = () => {
		this.items = [];
	};
}

/** Context API Helpers */
export const setCart = () => setContext('cartState', new UseCart());
export const useCart = () => getContext<UseCart>('cartState');
