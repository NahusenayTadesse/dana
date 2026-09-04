import {
	loadSettingsScreen,
	resetSettingsScreen,
	saveSettingsScreen
} from '$lib/server/settingsScreen';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => loadSettingsScreen('company');

export const actions: Actions = {
	save: ({ request, locals }) => saveSettingsScreen('company', request, locals?.user?.id),
	reset: ({ request }) => resetSettingsScreen('company', request)
};
