// Which permission each dashboard page and form action requires.
//
// Keyed by SvelteKit route id. `view` guards page loads (GET, including the
// client's `__data.json` requests); `actions` guards each `?/action` POST.
// Enforced for every request in `hooks.server.ts`.
//
// Fail closed: a dashboard route or action missing from this map is allowed
// for super admins only (and logged), so adding a page without a rule can't
// silently expose it. `scripts/check-permission-rules.ts` lists any gaps.

import { PERMISSION_KEYS, type Access, type PermissionKey } from '$lib/permissions';

/**
 * - a permission key
 * - a list of keys: any one of them is enough
 * - 'dashboard': anyone who can enter the dashboard
 */
export type Requirement = PermissionKey | readonly PermissionKey[] | 'dashboard';

export type RouteRule = { view: Requirement; actions?: Record<string, Requirement> };

/** view/add/edit/delete for a module — only the actions the catalog defines for it. */
const crud = (module: string, extra: Record<string, Requirement> = {}): RouteRule => {
	const actions: Record<string, Requirement> = {};
	for (const [action, suffix] of [
		['add', 'create'],
		['edit', 'edit'],
		['delete', 'delete']
	] as const) {
		const key = `${module}.${suffix}`;
		if (PERMISSION_KEYS.has(key)) actions[action] = key as PermissionKey;
	}
	return { view: `${module}.view` as PermissionKey, actions: { ...actions, ...extra } };
};

const settingsScreen = (module: 'content' | 'settings'): RouteRule => ({
	view: `${module}.view`,
	actions: { save: `${module}.edit`, reset: `${module}.edit` }
});

export const ROUTE_RULES: Record<string, RouteRule> = {
	// ── General ────────────────────────────────────────────────────────────
	'/dashboard': { view: 'dashboard.view', actions: { logout: 'dashboard' } },
	'/dashboard/help': { view: 'dashboard' },
	'/dashboard/customers': { view: 'customers.view' },
	'/dashboard/customers/[id]': {
		view: 'customers.view',
		actions: { edit: 'customers.edit', delete: 'customers.delete' }
	},
	'/dashboard/customers/[id]/history': { view: 'customers.view' },

	// ── Sales ──────────────────────────────────────────────────────────────
	'/dashboard/quotes': {
		view: 'quotes.view',
		actions: { read: 'quotes.reply', reply: 'quotes.reply', delete: 'quotes.delete' }
	},
	'/dashboard/quotes/[id]': {
		view: 'quotes.view',
		actions: {
			startOrder: 'quotes.edit',
			addLine: 'quotes.edit',
			updateLine: 'quotes.edit',
			deleteLine: 'quotes.edit',
			saveOffer: 'quotes.edit',
			sendOffer: 'quotes.send',
			approveOrder: 'quotes.approve',
			rejectOrder: 'quotes.approve'
		}
	},
	'/dashboard/orders': {
		view: 'orders.view',
		actions: {
			add: 'orders.create',
			edit: 'orders.edit',
			requestBalance: 'orders.payments',
			addAdjustment: 'orders.adjustments',
			decideAdjustment: 'orders.adjustments',
			delete: 'orders.delete'
		}
	},
	'/dashboard/payment-links': {
		view: 'payment_links.view',
		actions: { revoke: 'payment_links.revoke' }
	},
	'/dashboard/promo-codes': crud('promo_codes'),
	'/dashboard/messages': {
		view: 'messages.view',
		actions: { read: 'messages.edit', delete: 'messages.delete' }
	},

	// ── Catalog ────────────────────────────────────────────────────────────
	'/dashboard/products': { view: 'products.view', actions: { addDiscount: 'products.discounts' } },
	'/dashboard/products/add-products': {
		view: 'products.create',
		actions: { addProduct: 'products.create' }
	},
	'/dashboard/products/single/[id]': {
		view: 'products.view',
		actions: {
			editProduct: 'products.edit',
			editGallery: 'products.edit',
			upsertVariantPrice: 'products.edit',
			deleteVariantPrice: 'products.edit',
			addVariant: 'products.edit',
			editVariant: 'products.edit',
			delete: 'products.delete',
			deleteVariant: 'products.delete',
			// Stock movements recorded from the product page.
			adjust: 'stock.edit',
			damaged: 'stock.edit'
		}
	},
	'/dashboard/products/single/[id]/ranges/[range]': { view: 'products.view' },
	'/dashboard/products/single/[id]/damaged': { view: 'products.view' },
	'/dashboard/products/single/[id]/damaged/[range]': { view: 'products.view' },
	'/dashboard/products/categories': crud('catalog'),
	'/dashboard/products/colors': crud('catalog'),
	'/dashboard/products/lengths': crud('catalog'),
	'/dashboard/products/tags': crud('catalog'),
	'/dashboard/products/thickness': crud('catalog'),
	'/dashboard/products/widths': crud('catalog'),
	'/dashboard/products/suppliers': { view: 'suppliers.view' },
	'/dashboard/products/suppliers/add-suppliers': {
		view: 'suppliers.create',
		actions: { add: 'suppliers.create' }
	},
	'/dashboard/products/suppliers/[id]': crud('suppliers'),

	// ── Inventory & production ─────────────────────────────────────────────
	'/dashboard/stock': crud('stock', { remove: 'stock.delete' }),
	'/dashboard/warehouses': crud('warehouses'),
	'/dashboard/raw-materials': crud('raw_materials'),
	'/dashboard/production': crud('production'),
	'/dashboard/purchase-orders': crud('purchase_orders'),
	'/dashboard/purchase-orders/[id]': {
		view: 'purchase_orders.view',
		actions: {
			addLine: 'purchase_orders.edit',
			editLine: 'purchase_orders.edit',
			removeLine: 'purchase_orders.edit',
			editOrder: 'purchase_orders.edit'
		}
	},
	'/dashboard/staff': crud('staff'),

	// ── Website content ────────────────────────────────────────────────────
	'/dashboard/company-details': settingsScreen('content'),
	'/dashboard/page-text': settingsScreen('content'),
	'/dashboard/faq': {
		view: 'content.view',
		actions: {
			add: 'content.edit',
			edit: 'content.edit',
			remove: 'content.edit',
			move: 'content.edit',
			reset: 'content.edit'
		}
	},
	'/dashboard/site-images': {
		view: 'content.view',
		actions: { updateSlot: 'content.edit', resetSlot: 'content.edit' }
	},
	'/dashboard/testimonials': {
		view: 'content.view',
		actions: { add: 'content.edit', edit: 'content.edit', delete: 'content.edit' }
	},
	'/dashboard/logos': { view: 'content.view', actions: { editGallery: 'content.edit' } },
	'/dashboard/blog': { view: 'blog.view' },
	'/dashboard/blog/add-blog': { view: 'blog.create', actions: { addBlog: 'blog.create' } },
	'/dashboard/blog/category': crud('blog'),
	'/dashboard/blog/single/[id]': {
		view: 'blog.view',
		actions: { editProduct: 'blog.edit', editGallery: 'blog.edit', delete: 'blog.delete' }
	},

	// ── Analytics & administration ─────────────────────────────────────────
	'/dashboard/reports': { view: 'reports.view' },
	'/dashboard/reports/[range]': { view: 'reports.view' },
	'/dashboard/business-settings': settingsScreen('settings'),
	'/dashboard/admin-panel': { view: ['users.view', 'roles.view', 'payment_methods.view'] },
	'/dashboard/admin-panel/payment-methods': crud('payment_methods'),
	'/dashboard/admin-panel/users': { view: 'users.view' },
	'/dashboard/admin-panel/users/add-users': { view: 'users.create', actions: { add: 'users.create' } },
	'/dashboard/admin-panel/users/[id]': {
		view: 'users.view',
		actions: { editUser: 'users.edit', editPermissions: 'users.edit', delete: 'users.delete' }
	},
	'/dashboard/admin-panel/roles': { view: 'roles.view' },
	'/dashboard/admin-panel/roles/add-roles': { view: 'roles.create', actions: { add: 'roles.create' } },
	'/dashboard/admin-panel/roles/[id]': {
		view: 'roles.view',
		actions: { edit: 'roles.edit', editPermissions: 'roles.edit', delete: 'roles.delete' }
	}
};

export function meets(access: Access, requirement: Requirement): boolean {
	if (access.superAdmin) return true;
	if (requirement === 'dashboard') return access.permissions.length > 0;
	const keys = typeof requirement === 'string' ? [requirement] : requirement;
	return keys.some((key) => access.permissions.includes(key));
}

export type RouteCheck =
	| { allowed: true }
	| { allowed: false; reason: 'forbidden' | 'unmapped'; requirement?: Requirement };

/**
 * Check a dashboard request. `action` is the form action name for POSTs
 * (`'default'` for an unnamed action) and undefined for page loads.
 */
export function checkRoute(routeId: string, action: string | undefined, access: Access): RouteCheck {
	const rule = ROUTE_RULES[routeId];
	const requirement = rule && (action === undefined ? rule.view : rule.actions?.[action]);

	if (requirement === undefined) {
		if (access.superAdmin) return { allowed: true };
		return { allowed: false, reason: 'unmapped' };
	}
	return meets(access, requirement)
		? { allowed: true }
		: { allowed: false, reason: 'forbidden', requirement };
}

/**
 * Where a user lands when they can't see the dashboard home: the first page in
 * sidebar order they're allowed to open.
 */
export const LANDING_PAGES: { url: string; routeId: string }[] = [
	'/dashboard',
	'/dashboard/quotes',
	'/dashboard/orders',
	'/dashboard/customers',
	'/dashboard/products',
	'/dashboard/messages',
	'/dashboard/promo-codes',
	'/dashboard/payment-links',
	'/dashboard/stock',
	'/dashboard/warehouses',
	'/dashboard/production',
	'/dashboard/raw-materials',
	'/dashboard/purchase-orders',
	'/dashboard/staff',
	'/dashboard/company-details',
	'/dashboard/blog',
	'/dashboard/reports',
	'/dashboard/business-settings',
	'/dashboard/admin-panel',
	'/dashboard/help'
].map((url) => ({ url, routeId: url }));

export function landingPageFor(access: Access): string | null {
	return LANDING_PAGES.find((page) => checkRoute(page.routeId, undefined, access).allowed)?.url ?? null;
}
