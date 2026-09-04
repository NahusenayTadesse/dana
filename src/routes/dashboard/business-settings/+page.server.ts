import {
	loadSettingsScreen,
	resetSettingsScreen,
	saveSettingsScreen
} from '$lib/server/settingsScreen';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => loadSettingsScreen('operations');

export const actions: Actions = {
	save: ({ request, locals }) => saveSettingsScreen('operations', request, locals?.user?.id),
	reset: ({ request }) => resetSettingsScreen('operations', request)
};
