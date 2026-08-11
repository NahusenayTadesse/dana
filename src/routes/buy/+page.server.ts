import { loadBuyProductList } from '$lib/server/buy-listing';
import type { PageServerLoad } from './$types';

// Everything a very non-technical buyer needs is loaded up front — no filters,
// no pagination — so the whole pick-a-product -> configure -> total flow can
// happen on this one page. /checkout loads the same list for the same reason:
// its order blocks are the ones from this page.
export const load: PageServerLoad = async () => {
	return { productList: await loadBuyProductList() };
};
