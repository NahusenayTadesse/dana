import { db } from '$lib/server/db';
import {
	user,
	roles,
	gallery,
	products,
	productCategories,
	blog,
	blogCategories,
	orderItems,
	testimonials,
	siteImages as siteImagesTable,
	siteSettings as siteSettingsTable,
	faqItems as faqItemsTable
} from '$lib/server/db/schema';
import { eq, sql, desc, inArray, getTableColumns } from 'drizzle-orm';
import type { LayoutServerLoad } from './$types';
import { fetchVariantRowsForProducts, assembleProductCard } from '$lib/server/product-listing';
import { resolveSiteImages } from '$lib/siteImages';
import { resolveSiteSettings } from '$lib/siteSettings';
import { resolveFaq } from '$lib/faqItems';

const HOME_FEATURED_LIMIT = 9;

export const load: LayoutServerLoad = async ({ locals }) => {
	const currentUser = locals?.user;
	let roleName = ''; // Initialize with a default value

	// 1. Fetch the role name if a user exists
	if (currentUser) {
		const roleData = await db
			.select({ name: roles.name })
			.from(user)
			.leftJoin(roles, eq(user.roleId, roles.id))
			.where(eq(user.id, currentUser.id))
			.then((rows) => rows[0]);

		roleName = roleData?.name ?? '';
	}
	const images = await db.select().from(gallery);

	const imagesList = images.map((img) => img.imageUrl);

	// Admin-managed imagery for the public pages. Slots with no rows resolve to
	// their bundled defaults, so this is safe on an empty table.
	const siteImageRows = await db
		.select({
			slot: siteImagesTable.slot,
			imageUrl: siteImagesTable.imageUrl,
			sortOrder: siteImagesTable.sortOrder
		})
		.from(siteImagesTable)
		.orderBy(siteImagesTable.slot, siteImagesTable.sortOrder);

	const siteImages = resolveSiteImages(siteImageRows);

	// Phone numbers, emails and social links. Same override rule: a key with no
	// row falls back to the bundled default, a row holding '' means "hide this".
	const siteSettingRows = await db
		.select({
			settingKey: siteSettingsTable.settingKey,
			settingValue: siteSettingsTable.settingValue
		})
		.from(siteSettingsTable);

	const siteSettings = resolveSiteSettings(siteSettingRows);

	// The About page FAQ. No rows means "use the nine questions in the code".
	const faqRows = await db
		.select({
			id: faqItemsTable.id,
			sortOrder: faqItemsTable.sortOrder,
			icon: faqItemsTable.icon,
			questionEn: faqItemsTable.questionEn,
			questionAm: faqItemsTable.questionAm,
			answerEn: faqItemsTable.answerEn,
			answerAm: faqItemsTable.answerAm,
			isActive: faqItemsTable.isActive
		})
		.from(faqItemsTable)
		.orderBy(faqItemsTable.sortOrder, faqItemsTable.id);

	const faq = resolveFaq(faqRows);

	// Rank active products by total ordered quantity (LEFT JOIN so products with zero
	// orders still show up, just ranked last) — a single join, no fan-out.
	const bestSellingRows = await db
		.select({
			productId: products.id,
			orderedQty: sql<number>`coalesce(sum(${orderItems.quantity}), 0)`
		})
		.from(products)
		.leftJoin(orderItems, eq(orderItems.productId, products.id))
		.where(eq(products.isActive, true))
		.groupBy(products.id)
		.orderBy(desc(sql`coalesce(sum(${orderItems.quantity}), 0)`))
		.limit(HOME_FEATURED_LIMIT);

	const featuredIds = bestSellingRows.map((r) => r.productId);

	const featuredProductsData = featuredIds.length
		? await db
				.select({
					productId: products.id,
					productName: products.name,
					slug: products.slug,
					image: products.featuredImage,
					categoryName: productCategories.name,
					baseQuantity: products.quantity,
					brand: products.brand,
					coatingType: products.coatingType,
					thickness: products.thickness,
					width: products.width,
					soldBy: products.soldBy
				})
				.from(products)
				.leftJoin(productCategories, eq(productCategories.id, products.categoryId))
				.where(inArray(products.id, featuredIds))
		: [];

	const featuredVariantRows = await fetchVariantRowsForProducts(featuredIds);

	// Re-order to match the best-selling rank (the IN query above doesn't preserve it)
	const productList = featuredIds
		.map((id) => featuredProductsData.find((p) => p.productId === id))
		.filter((p): p is (typeof featuredProductsData)[number] => p !== undefined)
		.map((p) => assembleProductCard(p, featuredVariantRows));

	const testimonialList = await db
		.select()
		.from(testimonials)
		.where(eq(testimonials.isApproved, true));

	const blogItems = await db
		.select({
			...getTableColumns(blog),
			category: blogCategories.name
		})
		.from(blog)
		.leftJoin(blogCategories, eq(blog.categoryId, blogCategories.id));

	return {
		roleName,
		user: currentUser,
		blogItems,
		testimonialList,
		imagesList,
		siteImages,
		siteSettings,
		faq,
		bestSelling: productList
	};
};
