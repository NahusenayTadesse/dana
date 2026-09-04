import {
	loadSettingsScreen,
	resetSettingsScreen,
	saveSettingsScreen
} from '$lib/server/settingsScreen';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => loadSettingsScreen('content');

export const actions: Actions = {
	save: ({ request, locals }) => saveSettingsScreen('content', request, locals?.user?.id),
	reset: ({ request }) => resetSettingsScreen('content', request)
};
