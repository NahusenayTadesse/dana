import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getCurrentMonthRange } from '$lib/global.svelte';
import { parseIdParam } from '$lib/server/params';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseIdParam(params.id);
	// Was missing `/single`, which sent every visit to a 404.
	redirect(303, `/dashboard/products/single/${id}/damaged/${getCurrentMonthRange()}`);
};
