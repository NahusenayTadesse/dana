import { db } from '$lib/server/db';
import { productSuppliers as supplySuppliers } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types.js';

// Add/edit happen on the add-suppliers and [id] routes, each with their own
// form + action — this list view is read-only.
export const load: PageServerLoad = async () => {
	const allData = await db
		.select({
			id: supplySuppliers.id,
			name: supplySuppliers.name,
			phone: supplySuppliers.phone,
			email: supplySuppliers.email,
			description: supplySuppliers.description,
			status: supplySuppliers.isActive
		})
		.from(supplySuppliers);

	return {
		allData
	};
};
