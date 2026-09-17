/**
 * Verify every dashboard page and form action has a permission rule, and every
 * rule points at a permission that exists in the catalog.
 *
 *   npm run check:permissions
 *
 * Exits non-zero on any gap. Unmapped routes/actions still work for super
 * admins at runtime (fail closed), but everyone else gets a 403 — so run this
 * after adding a dashboard page or action.
 */
import fs from 'node:fs';
import path from 'node:path';
import { PERMISSION_KEYS } from '../src/lib/permissions';
import { ROUTE_RULES, type Requirement } from '../src/lib/server/permissionRules';

const ROUTES_DIR = path.resolve('src/routes');
const problems: string[] = [];

function walk(dir: string): string[] {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name);
		return entry.isDirectory() ? walk(full) : [full];
	});
}

/** Route id from a file path: strips (groups) the way SvelteKit does. */
function routeIdOf(file: string): string {
	const rel = path.relative(ROUTES_DIR, path.dirname(file)).split(path.sep);
	const id = '/' + rel.filter((segment) => !/^\(.+\)$/.test(segment)).join('/');
	return id === '/' ? '/' : id.replace(/\/$/, '');
}

/** Top-level keys of `export const actions = { ... }`. */
function actionNames(source: string): string[] {
	const start = source.search(/export const actions[^=]*=\s*\{/);
	if (start < 0) return [];
	let depth = 0;
	let i = source.indexOf('{', start);
	const names: string[] = [];
	let lineStart = true;
	for (; i < source.length; i++) {
		const ch = source[i];
		if (ch === '{') depth++;
		else if (ch === '}') {
			depth--;
			if (depth === 0) break;
		} else if (depth === 1 && lineStart) {
			const match = /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?::|\()/.exec(source.slice(i, i + 80));
			if (match) names.push(match[1]);
		}
		lineStart = ch === '\n' || (lineStart && /\s/.test(ch));
	}
	return [...new Set(names)];
}

const files = walk(path.join(ROUTES_DIR, 'dashboard'));
// A route is a page if it has a component or a server load (redirect-only pages count).
const pageRoutes = new Set(files.filter((f) => /\+page\.(svelte|server\.ts)$/.test(f)).map(routeIdOf));

for (const routeId of pageRoutes) {
	if (!ROUTE_RULES[routeId]) problems.push(`No rule for page ${routeId}`);
}

for (const file of files.filter((f) => /\+page\.server\.ts$/.test(f))) {
	const routeId = routeIdOf(file);
	for (const action of actionNames(fs.readFileSync(file, 'utf8'))) {
		if (!ROUTE_RULES[routeId]?.actions?.[action]) {
			problems.push(`No rule for action ${routeId} ?/${action}`);
		}
	}
}

const check = (where: string, requirement: Requirement) => {
	if (requirement === 'dashboard') return;
	for (const key of typeof requirement === 'string' ? [requirement] : requirement) {
		if (!PERMISSION_KEYS.has(key)) problems.push(`${where} references unknown permission "${key}"`);
	}
};
for (const [routeId, rule] of Object.entries(ROUTE_RULES)) {
	if (!pageRoutes.has(routeId)) problems.push(`Rule for ${routeId} matches no dashboard page`);
	check(routeId, rule.view);
	for (const [action, requirement] of Object.entries(rule.actions ?? {})) {
		check(`${routeId} ?/${action}`, requirement);
	}
}

if (problems.length) {
	console.error(problems.map((p) => `✗ ${p}`).join('\n'));
	process.exit(1);
}
console.log(`✓ ${pageRoutes.size} dashboard pages and their actions all have permission rules.`);
