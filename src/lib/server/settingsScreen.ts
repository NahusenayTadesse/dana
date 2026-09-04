import { superValidate, message, type SuperValidated } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { inArray } from 'drizzle-orm';

import { db } from '$lib/server/db';
import { siteSettings } from '$lib/server/db/schema';
import {
	fieldViewsForScreen,
	fieldsForScreen,
	resolveSiteSettings,
	type SettingScreen
} from '$lib/siteSettings';
import { buildSaveSchema, resetSchema } from '$lib/settingsSchema';

/**
 * The load and the two actions behind a settings screen. Company Details and
 * Page Text run the same code against different slices of the registry — a
 * screen only ever clears and rewrites its own keys, so saving one cannot wipe
 * the other's rows.
 */

const keysFor = (screen: SettingScreen) => fieldsForScreen(screen).map((field) => field.key);

export async function loadSettingsScreen(screen: SettingScreen) {
	const keys = keysFor(screen);

	const rows = await db
		.select({ settingKey: siteSettings.settingKey, settingValue: siteSettings.settingValue })
		.from(siteSettings);

	const resolved = resolveSiteSettings(rows);

	const form = await superValidate(resolved, zod4(buildSaveSchema(screen)));
	const resetForm = await superValidate(zod4(resetSchema));

	return {
		form,
		resetForm,
		screen,
		fields: fieldViewsForScreen(screen),
		customised: rows.map((row) => row.settingKey).filter((key) => keys.includes(key))
	};
}

export async function saveSettingsScreen(
	screen: SettingScreen,
	request: Request,
	userId: string | undefined
) {
	const fields = fieldsForScreen(screen);
	const form = (await superValidate(request, zod4(buildSaveSchema(screen)))) as SuperValidated<
		Record<string, string>
	>;

	if (!form.valid) {
		return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
	}

	try {
		await db.transaction(async (tx) => {
			// Delete-then-insert over this screen's keys, so the table only ever
			// holds what differs from the code. A field saved back to exactly its
			// default writes no row and goes on tracking the code, which is what
			// makes "restore originals" a plain DELETE.
			await tx.delete(siteSettings).where(inArray(siteSettings.settingKey, fields.map((f) => f.key)));

			const changed = fields
				.filter((field) => form.data[field.key] !== field.default)
				.map((field) => ({
					settingKey: field.key,
					settingValue: form.data[field.key],
					updatedBy: userId
				}));

			if (changed.length) await tx.insert(siteSettings).values(changed);
		});

		return message(form, { type: 'success', text: 'Saved' });
	} catch (err) {
		console.error(`${screen} settings save failed`, err);
		return message(form, { type: 'error', text: 'Could not save your changes.' }, { status: 500 });
	}
}

export async function resetSettingsScreen(screen: SettingScreen, request: Request) {
	const form = await superValidate(request, zod4(resetSchema));

	if (!form.valid) {
		return message(form, { type: 'error', text: 'Nothing to reset' }, { status: 400 });
	}

	try {
		await db.delete(siteSettings).where(inArray(siteSettings.settingKey, keysFor(screen)));
		return message(form, { type: 'success', text: 'Restored the original wording' });
	} catch (err) {
		console.error(`${screen} settings reset failed`, err);
		return message(form, { type: 'error', text: 'Could not restore the defaults.' }, { status: 500 });
	}
}
