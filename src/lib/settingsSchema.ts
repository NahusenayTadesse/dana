import { z } from 'zod/v4';
import { SITE_SETTING_MAP, fieldsForScreen, type SettingScreen } from '$lib/siteSettings';

// A phone number as people actually write one: digits, an optional country
// code, and whatever spacing they like. Deliberately loose — the operator is
// typing their own number, not filling in a validated form.
const phonePattern = /^\+?[\d\s()./-]{6,25}$/;

function fieldRule(key: string) {
	const field = SITE_SETTING_MAP[key];
	const optional = field.optional ?? false;

	return z
		.string()
		.trim()
		.max(500, 'That is too long')
		.refine((value) => optional || value.length > 0, `${field.label} cannot be empty`)
		.refine(
			(value) => value === '' || field.kind !== 'tel' || phonePattern.test(value),
			'Enter a phone number, e.g. 0919 05 06 07'
		)
		.refine(
			(value) => value === '' || field.kind !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value),
			'Enter a valid email address'
		)
		.refine(
			(value) => value === '' || field.kind !== 'url' || /^https?:\/\/\S+$/.test(value),
			'Enter a full link starting with https://'
		)
		.refine(
			(value) => value === '' || !field.pattern || field.pattern.test(value),
			field.patternMessage ?? 'That does not look right'
		)
		.refine(
			(value) => value === '' || !field.validate || field.validate(value),
			field.patternMessage ?? 'That does not look right'
		);
}

/**
 * One field per registered setting on this screen, so adding a key to the
 * registry adds it to the form without touching this file. Scoped per screen
 * because each screen's save action clears and rewrites exactly its own keys.
 */
export function buildSaveSchema(screen: SettingScreen) {
	return z.object(Object.fromEntries(fieldsForScreen(screen).map((f) => [f.key, fieldRule(f.key)])));
}

export const resetSchema = z.object({
	confirm: z.literal(true)
});
