/**
 * Sync the dashboard permission catalog ($lib/permissions.ts) into the database
 * and set up the default roles.
 *
 *   npm run db:seed:permissions                 apply to DATABASE_URL
 *   npm run db:seed:permissions -- --dry-run    print what would run, change nothing
 *   npm run db:seed:permissions -- --sql drizzle/seed_permissions.sql
 *                                               write the same statements to a SQL file
 *   ... -- --prune           also delete permissions that are no longer in the catalog
 *   ... -- --reset-presets   overwrite the preset roles' grants with the defaults below
 *
 * Safe to run on every deploy:
 * - every catalog permission is upserted (descriptions kept current);
 * - the Admin role always holds every permission (it bypasses checks anyway —
 *   the rows just make the role editor show it as full access);
 * - preset roles are created if missing and given their default grants only
 *   while they have no grants at all, so roles you've customised are left alone;
 * - nothing is removed unless --prune / --reset-presets is passed.
 *
 * Requires migration 0013 (unique grant indexes) to be applied first.
 */
import fs from 'node:fs';
import mysql from 'mysql2/promise';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '../src/lib/permissions';

type PresetRole = { name: string; description: string; grants: string[] };

/** `module.*` grants every action of a module. */
const PRESET_ROLES: PresetRole[] = [
	{
		name: 'Manager',
		description: 'Runs day-to-day operations. Everything except user, role and payment-method administration.',
		grants: [
			'dashboard.*', 'customers.*', 'quotes.*', 'orders.*', 'payment_links.*', 'promo_codes.*',
			'messages.*', 'products.*', 'catalog.*', 'suppliers.*', 'stock.*', 'warehouses.*',
			'raw_materials.*', 'production.*', 'purchase_orders.*', 'staff.*', 'content.*', 'blog.*',
			'reports.*', 'settings.view', 'payment_methods.view', 'users.view', 'roles.view'
		]
	},
	{
		name: 'Sales',
		description: 'Handles quotes, orders, customers and payments.',
		grants: [
			'dashboard.view', 'customers.view', 'customers.edit', 'quotes.*',
			'orders.view', 'orders.create', 'orders.edit', 'orders.payments', 'orders.adjustments',
			'payment_links.*', 'promo_codes.view', 'messages.view', 'messages.edit',
			'products.view', 'catalog.view', 'stock.view', 'reports.view'
		]
	},
	{
		name: 'Inventory',
		description: 'Manages stock, warehouses, production and purchasing.',
		grants: [
			'dashboard.view', 'orders.view', 'products.view', 'catalog.view',
			'suppliers.view', 'suppliers.create', 'suppliers.edit',
			'stock.*', 'warehouses.*', 'raw_materials.*', 'production.*', 'purchase_orders.*', 'staff.view'
		]
	},
	{
		name: 'Content Editor',
		description: 'Maintains the public website: company details, page text, FAQ, images, testimonials and blog.',
		grants: ['content.*', 'blog.*', 'messages.view']
	}
];

const CUSTOMER_ROLE = { name: 'Customer', description: 'Shop customer — no dashboard access.' };

// ── Build the statements ─────────────────────────────────────────────────────

const f = mysql.format;

function expand(grants: string[]): string[] {
	const keys = new Set<string>();
	for (const grant of grants) {
		const matches = grant.endsWith('.*')
			? PERMISSIONS.filter((p) => p.module === grant.slice(0, -2))
			: PERMISSIONS.filter((p) => p.key === grant);
		if (matches.length === 0) throw new Error(`Preset grant "${grant}" matches no permission in the catalog.`);
		for (const p of matches) keys.add(p.key);
	}
	return [...keys];
}

function buildStatements({ prune, resetPresets }: { prune: boolean; resetPresets: boolean }): string[] {
	const out: string[] = [];

	// 1. Permissions
	for (const p of PERMISSIONS) {
		out.push(
			f(
				'INSERT INTO `permissions` (`name`, `description`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);',
				[p.key, `${p.moduleLabel} — ${p.description}`.slice(0, 255)]
			)
		);
	}
	if (prune) {
		out.push(
			f('DELETE FROM `permissions` WHERE `name` NOT IN (?);', [PERMISSIONS.map((p) => p.key)])
		);
	}

	// 2. Roles
	for (const role of [
		{ name: SUPER_ADMIN_ROLE, description: 'Full access to everything.' },
		CUSTOMER_ROLE,
		...PRESET_ROLES
	]) {
		out.push(
			f('INSERT INTO `roles` (`name`, `description`, `is_active`) SELECT ?, ?, true FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM `roles` WHERE `name` = ?);', [
				role.name,
				role.description,
				role.name
			])
		);
	}

	// 3. Admin holds everything
	out.push(
		f(
			'INSERT INTO `role_permissions` (`role_id`, `permission_id`, `is_active`) SELECT r.`id`, p.`id`, true FROM `roles` r JOIN `permissions` p WHERE r.`name` = ? ON DUPLICATE KEY UPDATE `is_active` = true;',
			[SUPER_ADMIN_ROLE]
		)
	);

	// 4. Preset roles: defaults only while the role has no grants
	for (const role of PRESET_ROLES) {
		if (resetPresets) {
			out.push(
				f('DELETE rp FROM `role_permissions` rp JOIN `roles` r ON r.`id` = rp.`role_id` WHERE r.`name` = ?;', [role.name])
			);
		}
		out.push(
			f(
				'INSERT INTO `role_permissions` (`role_id`, `permission_id`, `is_active`) SELECT r.`id`, p.`id`, true FROM `roles` r JOIN `permissions` p ON p.`name` IN (?) WHERE r.`name` = ? AND NOT EXISTS (SELECT 1 FROM (SELECT `role_id` FROM `role_permissions`) existing WHERE existing.`role_id` = r.`id`);',
				[expand(role.grants), role.name]
			)
		);
	}

	return out;
}

// ── Run ──────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const sqlIndex = args.indexOf('--sql');
const sqlFile = sqlIndex >= 0 ? args[sqlIndex + 1] : null;

const statements = buildStatements({ prune: flag('--prune'), resetPresets: flag('--reset-presets') });

if (sqlFile) {
	const header = [
		'-- Dashboard permissions seed — generated by scripts/seed-permissions.ts. Do not edit by hand;',
		'-- change src/lib/permissions.ts (and the presets in the script) and regenerate:',
		'--   npm run db:seed:permissions -- --sql drizzle/seed_permissions.sql',
		'-- Idempotent. Requires migration 0013_permission_grants_unique.',
		`-- ${PERMISSIONS.length} permissions, ${PRESET_ROLES.length} preset roles.`,
		''
	];
	fs.writeFileSync(sqlFile, header.join('\n') + statements.join('\n') + '\n');
	console.log(`Wrote ${statements.length} statements to ${sqlFile}`);
	process.exit(0);
}

if (flag('--dry-run')) {
	console.log(statements.join('\n'));
	process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is not set (run through `npm run db:seed:permissions`, which loads .env).');
	process.exit(1);
}

const connection = await mysql.createConnection(url);
try {
	const [indexes] = await connection.query(
		"SHOW INDEX FROM `role_permissions` WHERE `Key_name` = 'role_permissions_role_permission_unique'"
	);
	if ((indexes as unknown[]).length === 0) {
		throw new Error('Migration 0013_permission_grants_unique is not applied. Run `npm run db:migrate` first.');
	}

	await connection.beginTransaction();
	for (const statement of statements) await connection.query(statement);
	await connection.commit();

	const [[counts]] = (await connection.query(
		'SELECT (SELECT COUNT(*) FROM `permissions`) AS permissions, (SELECT COUNT(*) FROM `roles`) AS roles, (SELECT COUNT(*) FROM `role_permissions`) AS grants'
	)) as unknown as [[{ permissions: number; roles: number; grants: number }]];
	console.log(
		`Permissions seeded: ${counts.permissions} permissions, ${counts.roles} roles, ${counts.grants} role grants.`
	);

	const [stale] = await connection.query('SELECT `name` FROM `permissions` WHERE `name` NOT IN (?)', [
		PERMISSIONS.map((p) => p.key)
	]);
	if ((stale as unknown[]).length > 0) {
		console.warn(
			`Not in the catalog any more (run with --prune to delete): ${(stale as { name: string }[]).map((r) => r.name).join(', ')}`
		);
	}
} catch (err) {
	await connection.rollback().catch(() => {});
	console.error(err instanceof Error ? err.message : err);
	process.exitCode = 1;
} finally {
	await connection.end();
}
