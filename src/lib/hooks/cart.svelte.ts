import { setContext, getContext } from 'svelte';

// A cart line is anchored to a specific productVariant — that's the atomic
// sellable unit (a fixed color+width+thickness+length combo with its own
// price/sku). Fields below mirror orderItems' spec columns directly so the
// cart, checkout, and the order it produces stay in the same shape end to
// end — no more collapsing the spec into an opaque display string.
export type CartItem = {
	variantId: number;
	productId: number;
	productName: string;
	sku: string | null;
	price: number;
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

class UseCart {
	items: CartItem[] = $state([]);
	isOpen: boolean = $state(false);

	/** Total items count */
	totalItems = $derived(this.items.reduce((sum, item) => sum + item.quantity, 0));

	/** Total price */
	totalPrice = $derived(this.items.reduce((sum, item) => sum + item.price * item.quantity, 0));

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
					this.items = parsed;
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

	/**
	 * Add item to cart. A variantId is now a unique enough key on its own —
	 * each variant already represents one exact sellable spec combination.
	 */
	addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
		if (item.price == null) {
			console.error('Refusing to add a quote-only variant (no price) to the cart:', item);
			return;
		}

		const existingIndex = this.items.findIndex((i) => i.variantId === item.variantId);

		if (existingIndex >= 0) {
			this.items[existingIndex].quantity += quantity;
		} else {
			this.items.push({ ...item, quantity });
		}
	};

	/** Remove a specific variant line from cart */
	removeItem = (variantId: number) => {
		this.items = this.items.filter((item) => item.variantId !== variantId);
	};

	/** Update quantity for a specific variant line */
	updateQuantity = (variantId: number, quantity: number) => {
		if (quantity <= 0) {
			this.removeItem(variantId);
			return;
		}

		const index = this.items.findIndex((i) => i.variantId === variantId);

		if (index >= 0) {
			this.items[index].quantity = quantity;
		}
	};

	clearCart = () => {
		this.items = [];
	};
}

/** Context API Helpers */
export const setCart = () => setContext('cartState', new UseCart());
export const useCart = () => getContext<UseCart>('cartState');