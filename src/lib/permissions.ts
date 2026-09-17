// The dashboard's permission catalog — the single source of truth.
//
// Every permission is `<module>.<action>` and is stored by that name in the
// `permissions` table (see `scripts/seed-permissions.ts`, which syncs this list
// into the database). Route and form-action requirements live in
// `$lib/server/permissionRules.ts` and may only reference keys defined here.
//
// Client-safe: no server imports, so pages can use `can()` to hide controls.

type ActionDef = { key: string; label: string; description: string };
type ModuleDef = { key: string; label: string; group: string; actions: ActionDef[] };

const view = (what: string): ActionDef => ({ key: 'view', label: 'View', description: `See ${what}` });
const create = (what: string): ActionDef => ({ key: 'create', label: 'Create', description: `Add ${what}` });
const edit = (what: string): ActionDef => ({ key: 'edit', label: 'Edit', description: `Change ${what}` });
const remove = (what: string): ActionDef => ({ key: 'delete', label: 'Delete', description: `Delete or archive ${what}` });

export const PERMISSION_MODULES = [
	// ── General ────────────────────────────────────────────────────────────
	{
		key: 'dashboard',
		label: 'Dashboard home',
		group: 'General',
		actions: [view('the dashboard home page: daily stats and reorder alerts')]
	},
	{
		key: 'customers',
		label: 'Customers',
		group: 'General',
		actions: [view('customers and their order history'), edit('customer details'), remove('customers')]
	},

	// ── Sales ──────────────────────────────────────────────────────────────
	{
		key: 'quotes',
		label: 'Quotes',
		group: 'Sales',
		actions: [
			view('quote requests and the quote builder'),
			{ key: 'reply', label: 'Reply', description: 'Reply to quote requests and mark them read' },
			edit('quote orders: start an order, add/change lines, save price offers'),
			{ key: 'send', label: 'Send offers', description: 'Email/SMS a priced offer with a payment link' },
			{ key: 'approve', label: 'Approve / reject', description: 'Approve or reject a quote order' },
			remove('quote requests')
		]
	},
	{
		key: 'orders',
		label: 'Orders',
		group: 'Sales',
		actions: [
			view('orders'),
			create('orders'),
			edit('orders: status, items, delivery and manual payment'),
			{
				key: 'payments',
				label: 'Request payments',
				description: 'Send balance payment links to customers'
			},
			{
				key: 'adjustments',
				label: 'Adjustments',
				description: 'Add post-delivery adjustments and approve/reject adjustment requests'
			},
			remove('orders')
		]
	},
	{
		key: 'payment_links',
		label: 'Payment links',
		group: 'Sales',
		actions: [
			view('payment links'),
			{ key: 'revoke', label: 'Revoke', description: 'Revoke a live payment link' }
		]
	},
	{
		key: 'promo_codes',
		label: 'Promo codes',
		group: 'Sales',
		actions: [view('promo codes'), create('promo codes'), edit('promo codes')]
	},
	{
		key: 'messages',
		label: 'Messages',
		group: 'Sales',
		actions: [view('contact messages'), edit('messages (mark as read)'), remove('messages')]
	},

	// ── Catalog ────────────────────────────────────────────────────────────
	{
		key: 'products',
		label: 'Products',
		group: 'Catalog',
		actions: [
			view('products, variants and price books'),
			create('products'),
			edit('products, variants, prices and galleries'),
			{ key: 'discounts', label: 'Discounts', description: 'Apply percentage discounts to products' },
			remove('products and variants')
		]
	},
	{
		key: 'catalog',
		label: 'Product attributes',
		group: 'Catalog',
		actions: [
			view('categories, colors, lengths, widths, thicknesses and tags'),
			create('product attributes'),
			edit('product attributes')
		]
	},
	{
		key: 'suppliers',
		label: 'Suppliers',
		group: 'Catalog',
		actions: [view('suppliers'), create('suppliers'), edit('suppliers'), remove('suppliers')]
	},

	// ── Inventory & production ─────────────────────────────────────────────
	{
		key: 'stock',
		label: 'Stock',
		group: 'Inventory & production',
		actions: [
			view('stock by warehouse'),
			create('stock lines'),
			edit('stock levels, adjustments and damaged items'),
			remove('stock lines')
		]
	},
	{
		key: 'warehouses',
		label: 'Warehouses',
		group: 'Inventory & production',
		actions: [view('warehouses'), create('warehouses'), edit('warehouses')]
	},
	{
		key: 'raw_materials',
		label: 'Raw materials',
		group: 'Inventory & production',
		actions: [view('raw materials'), create('raw materials'), edit('raw materials and on-hand quantities')]
	},
	{
		key: 'production',
		label: 'Production',
		group: 'Inventory & production',
		actions: [view('production batches'), create('production batches'), edit('production batches')]
	},
	{
		key: 'purchase_orders',
		label: 'Purchase orders',
		group: 'Inventory & production',
		actions: [view('purchase orders'), create('purchase orders'), edit('purchase orders and their lines')]
	},
	{
		key: 'staff',
		label: 'Staff',
		group: 'Inventory & production',
		actions: [view('staff'), create('staff'), edit('staff')]
	},

	// ── Website content ────────────────────────────────────────────────────
	{
		key: 'content',
		label: 'Website content',
		group: 'Website content',
		actions: [
			view('company details, page text, FAQ, site images, testimonials and partner logos'),
			edit('website content')
		]
	},
	{
		key: 'blog',
		label: 'Blog',
		group: 'Website content',
		actions: [view('blog posts and categories'), create('blog posts and categories'), edit('blog posts and categories'), remove('blog posts and categories')]
	},

	// ── Analytics & administration ─────────────────────────────────────────
	{
		key: 'reports',
		label: 'Reports',
		group: 'Administration',
		actions: [view('sales reports')]
	},
	{
		key: 'settings',
		label: 'Business settings',
		group: 'Administration',
		actions: [view('business settings (VAT, operations)'), edit('business settings')]
	},
	{
		key: 'payment_methods',
		label: 'Payment methods',
		group: 'Administration',
		actions: [view('payment methods'), create('payment methods'), edit('payment methods')]
	},
	{
		key: 'users',
		label: 'Users',
		group: 'Administration',
		actions: [
			view('users'),
			create('users'),
			edit('users, their role and special permissions'),
			remove('users')
		]
	},
	{
		key: 'roles',
		label: 'Roles',
		group: 'Administration',
		actions: [view('roles'), create('roles'), edit('roles and their permissions'), remove('roles')]
	}
] as const satisfies readonly ModuleDef[];

type Modules = (typeof PERMISSION_MODULES)[number];
export type PermissionKey = {
	[M in Modules as M['key']]: `${M['key']}.${M['actions'][number]['key']}`;
}[Modules['key']];

export type PermissionDef = {
	key: PermissionKey;
	module: string;
	moduleLabel: string;
	group: string;
	action: string;
	label: string;
	description: string;
};

/** Flat list of every permission, in catalog order. */
export const PERMISSIONS: PermissionDef[] = PERMISSION_MODULES.flatMap((m) =>
	m.actions.map((a) => ({
		key: `${m.key}.${a.key}` as PermissionKey,
		module: m.key,
		moduleLabel: m.label,
		group: m.group,
		action: a.key,
		label: a.label,
		description: `${a.description}.`
	}))
);

export const PERMISSION_KEYS = new Set<string>(PERMISSIONS.map((p) => p.key));

/** The role that bypasses every permission check. It can't be renamed or deleted. */
export const SUPER_ADMIN_ROLE = 'Admin';

/** What the client is told about the signed-in user's dashboard access. */
export type Access = { superAdmin: boolean; permissions: string[] };

/** True when `access` grants `key` (the Admin role is granted everything). */
export function can(access: Access | null | undefined, key: PermissionKey): boolean {
	if (!access) return false;
	return access.superAdmin || access.permissions.includes(key);
}

/** True when `access` grants at least one of `keys`. */
export function canAny(access: Access | null | undefined, keys: readonly PermissionKey[]): boolean {
	return keys.some((key) => can(access, key));
}
