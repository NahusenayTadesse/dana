import {
	mysqlTable,
	int,
	varchar,
	boolean,
	mysqlEnum,
	decimal,
	text,
	timestamp,
	uniqueIndex,
	index,
	date
} from 'drizzle-orm/mysql-core';
import { secureFields, user } from './auth.schema';

export const blogCategories = mysqlTable('blog_categories', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar({ length: 255 }).notNull(),
	description: varchar({ length: 255 }).notNull()
});

export const blog = mysqlTable('blog', {
	id: int('id').primaryKey().autoincrement(),
	title: varchar({ length: 255 }).notNull(),
	categoryId: int('category_id')
		.notNull()
		.references(() => blogCategories.id),
	slug: varchar({ length: 255 }).notNull(),
	excerpt: text(),
	content: text(),
	isFeaturedOnHome: boolean('is_featured_on_home').default(false),
	featuredImage: varchar('featured_image', { length: 255 }),
	...secureFields
});

export const blogGallery = mysqlTable('blog_gallery', {
	id: int('id').primaryKey().autoincrement(),
	blogId: int('blog_id')
		.notNull()
		.references(() => blog.id),
	imageUrl: varchar('image_url', { length: 255 })
});

export const paymentMethods = mysqlTable('payment_methods', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	...secureFields
});

export const productSuppliers = mysqlTable('product_suppliers', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 50 }).notNull(),
	phone: varchar('phone', { length: 20 }).notNull(),
	email: varchar('email', { length: 100 }),
	description: varchar('description', { length: 255 }),
	...secureFields
});

// Product categories: PPGI, GI, Roof Tiles, Steel Accessories
export const productCategories = mysqlTable('product_categories', {
	id: int('id').autoincrement().primaryKey(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	...secureFields
});

export const categoriesProducts = mysqlTable('categories_products', {
	id: int('id').autoincrement().primaryKey(),
	categoryId: int('category_id').references(() => productCategories.id, { onDelete: 'cascade' }),
	productId: int('product_id').references(() => products.id, { onDelete: 'cascade' }),
	...secureFields
});

// Core product catalog entry — retail fields (price/stock/commission/supplier)
// restored, plus the technical/spec fields from the brief's product page
// requirements, so the same product can be sold retail AND quoted for bulk.
export const products = mysqlTable('products', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull(),
	slug: varchar('slug', { length: 120 }).notNull().unique(),
	brand: varchar('brand', { length: 100 }),
	categoryId: int('category_id')
		.notNull()
		.references(() => productCategories.id),
	featuredImage: varchar('featured_image', { length: 255 }),
	description: varchar('description', { length: 255 }),
	overview: text('overview'), // "Short explanation of what it is and who it's for"

	// Retail / inventory fields
	quantity: int('quantity').notNull().default(0),
	commissionAmount: decimal('commission_amount', { precision: 10, scale: 2 })
		.notNull()
		.default('0'),
	supplierId: int('supplier_id').references(() => productSuppliers.id),
	reorderLevel: int('reorder_level'),

	// How this product is sold: by piece count ("quantity"), by length (e.g.
	// running meters), or both at once (e.g. N pieces each of length X).
	soldBy: mysqlEnum('sold_by', ['quantity', 'length', 'both']).notNull().default('quantity'),

	// Technical specifications
	thickness: varchar('thickness', { length: 100 }), // e.g. range in mm — also caps custom quote requests
	width: varchar('width', { length: 100 }), // also caps custom quote requests
	// Max length a customer can request in a custom quote (mm/m/ft). No text
	// range field for this like thickness/width, so it's explicit here.
	maxLength: decimal('max_length', { precision: 10, scale: 2 }),
	maxLengthUnit: mysqlEnum('max_length_unit', ['mm', 'm', 'ft']).default('m'),
	// When true, the buyer can dial length up/down freely (e.g. the /buy page's
	// +/- stepper) instead of only picking between the catalog's fixed length
	// variants. minLength is the floor for that dial; lengthStep is the
	// increment each +/- press moves by; maxLength (above) is the ceiling.
	isLengthCustomizable: boolean('is_length_customizable').notNull().default(false),
	minLength: decimal('min_length', { precision: 10, scale: 2 }),
	lengthStep: decimal('length_step', { precision: 10, scale: 2 }),
	coatingType: varchar('coating_type', { length: 100 }), // e.g. PPGI, GI
	colorOptions: varchar('color_options', { length: 255 }),
	sizeRange: varchar('size_range', { length: 100 }),
	finish: varchar('finish', { length: 100 }),

	// Free-text supporting content blocks
	performanceFeatures: text('performance_features'),
	advantages: text('advantages'),
	applications: text('applications'),

	isFeaturedOnHome: boolean('is_featured_on_home').default(false),
	...secureFields
});

export const tags = mysqlTable('tags', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 50 }).notNull()
});

export const productTags = mysqlTable('product_tags', {
	productId: int('product_id').references(() => products.id, { onDelete: 'cascade' }),
	tagId: int('tag_id').references(() => tags.id, { onDelete: 'cascade' })
});

export const productImages = mysqlTable('product_images', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	imageUrl: varchar('image_url', { length: 255 }).notNull()
});


 
export const colors = mysqlTable('colors', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull().unique(), // e.g. "Signal Red"
	code: varchar('code', { length: 50 }), // e.g. RAL 3001 / manufacturer color code
	hexValue: varchar('hex_value', { length: 7 }), // for swatch rendering, e.g. #C1121F
	swatchImage: varchar('swatch_image', { length: 255 }),
	...secureFields
});
 
export const widths = mysqlTable('widths', {
	id: int('id').primaryKey().autoincrement(),
	value: decimal('value', { precision: 10, scale: 2 }).notNull(), // numeric so it sorts/filters correctly
	unit: mysqlEnum('unit', ['mm', 'cm', 'm', 'in', 'ft']).notNull().default('mm'),
	label: varchar('label', { length: 50 }), // optional display override, e.g. "Standard 1000mm"
	isActive: boolean('is_active').default(true)
}, (table) => [
 uniqueIndex('widths_value_unit_unique').on(table.value, table.unit)
]);



 
export const thicknesses = mysqlTable('thicknesses', {
	id: int('id').primaryKey().autoincrement(),
	value: decimal('value', { precision: 10, scale: 3 }).notNull(), // 3dp: gauges like 0.425mm matter
	unit: mysqlEnum('unit', ['mm', 'gauge']).notNull().default('mm'),
	label: varchar('label', { length: 50 }),
	isActive: boolean('is_active').default(true)
}, (table) => ({
	uniqueValue: uniqueIndex('thicknesses_value_unit_unique').on(table.value, table.unit)
}));
 


export const productVariants = mysqlTable('product_variants', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
 
	colorId: int('color_id').references(() => colors.id, { onDelete: 'set null' }),
	widthId: int('width_id').references(() => widths.id, { onDelete: 'set null' }),
	thicknessId: int('thickness_id').references(() => thicknesses.id, { onDelete: 'set null' }),
	lengthId: int('length_id').references(() => lengths.id, { onDelete: 'set null' }),
 
	sku: varchar('sku', { length: 100 }).unique(),
	price: decimal('price', { precision: 10, scale: 2 }), // nullable: bulk/quote-only variants may not have a listed retail price
	quantity: int('quantity').notNull().default(0), // stock at this exact spec, not just the parent product
	reorderLevel: int('reorder_level'),
	imageUrl: varchar('image_url', { length: 255 }), // e.g. this color/finish specifically
 
	...secureFields
}, (table) => [ uniqueIndex('product_variant_spec_unique').on(
		table.productId,
		table.colorId,
		table.widthId,
		table.thicknessId,
		table.lengthId
	)
]);

// Standard price book for a variant: instead of one flat price, a variant
// can carry several rate components (per piece, per meter of length, per
// unit width/thickness, a color surcharge, ...). Whichever basis a product
// actually sells by (see products.soldBy) get their rate row here, and the
// sales person combines them when building a priceOffers.subtotal.
export const variantPrices = mysqlTable(
	'variant_prices',
	{
		id: int('id').primaryKey().autoincrement(),
		variantId: int('variant_id')
			.notNull()
			.references(() => productVariants.id, { onDelete: 'cascade' }),
		basis: mysqlEnum('basis', [
			'quantity',
			'length',
			'width',
			'thickness',
			'color',
			'weight', // price per kg/ton — common for sheet/coil steel
			'area' // price per m² — common for roofing/flat sheet
		]).notNull(),
		price: decimal('price', { precision: 12, scale: 2 }).notNull(), // rate for this basis, e.g. price/meter for 'length'
		// Client's source price sheet is inconsistent about this, so default to
		// false rather than assuming — must be set explicitly per rate.
		priceIncludesVat: boolean('price_includes_vat').notNull().default(false),
		...secureFields
	},
	(table) => [uniqueIndex('variant_prices_variant_basis_unique').on(table.variantId, table.basis)]
);

export const lengths = mysqlTable('lengths', {
	id: int('id').primaryKey().autoincrement(),
	value: decimal('value', { precision: 10, scale: 2 }).notNull(),
	unit: mysqlEnum('unit', ['mm', 'm', 'ft']).notNull().default('m'),
	label: varchar('label', { length: 50 }), // e.g. "Custom cut" for made-to-order lengths
	isCustom: boolean('is_custom').default(false), // flag for "cut to order" rather than a fixed stock length
	isActive: boolean('is_active').default(true)
}, (table) => [
	 uniqueIndex('lengths_value_unit_unique').on(table.value, table.unit)
]);


export const customers = mysqlTable('customers', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 100 }).notNull(),
	email: varchar('email', { length: 100 }).notNull().unique(),
	type: mysqlEnum('type', ['individual', 'company'] ).default('individual'),
	phone: varchar('phone', { length: 20 }),
	tinNo: varchar('tin_no', { length: 10 }),
	docs: varchar('docs', { length: 255 }),
	userId: varchar('user_id', { length: 255 })

		.references(() => user.id),
	address: varchar('address', { length: 255 }),

	// B2B wholesale commonly runs on net terms rather than pay-on-order.
	creditLimit: decimal('credit_limit', { precision: 12, scale: 2 }), // nullable: no credit account if unset
	creditDays: int('credit_days'), // e.g. 30 for "net 30"

	...secureFields
});

export const discounts = mysqlTable('discounts', {
	id: int('id').primaryKey().autoincrement(),
	amount: decimal('amount', { precision: 10, scale: 2 }),
	productId: int('product_id').references(() => products.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 50 }).notNull().unique(),
	description: varchar('description', { length: 255 }),
	...secureFields
});

export const transactions = mysqlTable('transactions', {
	id: int('id').primaryKey().autoincrement(),

	// The amount of the attempt CURRENTLY IN FLIGHT — rewritten every time the
	// customer starts a new checkout against this order. It is NOT a record of
	// what has been collected; read amountPaid for that.
	amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),

	// Cumulative total actually confirmed by a server-to-server Chapa verify.
	// Only ever moves up, only in settlePaymentAttempt(). These were the same
	// column once, which meant starting (and abandoning) a balance payment
	// overwrote the record of the advance already collected, and the order was
	// then re-invoiced for the wrong remainder.
	amountPaid: decimal('amount_paid', { precision: 10, scale: 2 }).notNull().default('0'),

	txnRef: varchar('txn_ref', { length: 255 }),

	// The txn_ref of the attempt that was last successfully settled. Doubles as
	// the settlement mutex: settling does a conditional UPDATE that only matches
	// when this differs from the ref being settled, so concurrent callers (the
	// Chapa webhook and the customer's return visit racing each other) can only
	// ever settle a given attempt once — and only one of them sends the email.
	settledTxnRef: varchar('settled_txn_ref', { length: 255 }),
	paymentStatus: mysqlEnum('payment_status', [
		'pending',
		'paid',
		'unpaid',
		'refunded',
		'partially_paid',
		'partially_refunded',
		'overpaid',
		'disputed'
	]).default('pending'),
	paymentMethodId: int('payment_method_id').references(() => paymentMethods.id, {
		onDelete: 'set null'
	}),
	recieptLink: varchar('reciept_link', { length: 255 }),
	...secureFields
});

export const productAdjustments = mysqlTable('product_adjustments', {
	id: int('id').autoincrement().primaryKey(),
	productsId: int('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	supplierId: int('supplier_id').references(() => productSuppliers.id),
	adjustment: int('adjustment').notNull(), // e.g., +50 for new stock, -1 for a sale, -1 for internal use
	reason: varchar('reason', { length: 255 }),
	transactionId: int('transaction_id').references(() => transactions.id),
	...secureFields
});

export const orders = mysqlTable('orders', {
	id: int('id').autoincrement().primaryKey(),
	customerId: int('customer_id').references(() => customers.id),
	status: mysqlEnum('status', ['pending', 'delivered', 'cancelled']),
	// Tracks quote/custom-spec negotiation separately from fulfillment status
	// above — a custom request (off-catalog length/color/thickness/width) has
	// to be approved or rejected by staff before it becomes a real order.
	requestStatus: mysqlEnum('request_status', ['pending', 'approved', 'rejected']).default(
		'pending'
	),
	transactionId: int('transaction_id').references(() => transactions.id),

	// Delivery — heavy sheet/coil steel is trucked out, and the drop-off is
	// often not the customer's billing address and gets negotiated separately.
	deliveryAddress: varchar('delivery_address', { length: 255 }), // nullable: falls back to customer.address if unset
	deliveryDate: date('delivery_date'),
	freightCost: decimal('freight_cost', { precision: 12, scale: 2 }),
	freightPaidBy: mysqlEnum('freight_paid_by', ['company', 'customer']).default('customer'),

	...secureFields
});

export const orderItems = mysqlTable('order_items', {
	id: int('id').autoincrement().primaryKey(),
	orderId: int('order_id').references(() => orders.id),
	productId: int('product_id').references(() => products.id),

	// Piece count, e.g. "10 sheets". Nullable — a pure length sale (e.g. "50m
	// of coil") may not have a meaningful piece count.
	quantity: int('quantity'),

	// Length sold, e.g. "50" meters, or "6" per piece when combined with
	// quantity above (10 pieces x 6m each). Nullable — a pure quantity sale
	// doesn't need this. At least one of quantity/length must be set.
	length: decimal('length', { precision: 10, scale: 2 }),
	lengthUnit: mysqlEnum('length_unit', ['mm', 'm', 'ft']).default('m'),

	// Customer's requested spec — a custom quote isn't limited to an existing
	// productVariants row, so these are captured directly on the line item.
	// variantId below becomes an optional pointer to the closest catalog
	// suggestion rather than the source of truth for what was requested.
	colorId: int('color_id').references(() => colors.id, { onDelete: 'set null' }),
	thickness: decimal('thickness', { precision: 10, scale: 3 }),
	thicknessUnit: mysqlEnum('thickness_unit', ['mm', 'gauge']).default('mm'),
	width: decimal('width', { precision: 10, scale: 2 }),
	widthUnit: mysqlEnum('width_unit', ['mm', 'cm', 'm', 'in', 'ft']).default('mm'),
	weight: decimal('weight', { precision: 12, scale: 3 }),
	weightUnit: mysqlEnum('weight_unit', ['kg', 'ton']).default('kg'),

	// Which dimension `price` is a rate against — quantity/length/width/etc all
	// being independently set above would otherwise leave the total ambiguous.
	// Snapshotted from variantPrices.basis when the line is priced.
	priceBasis: mysqlEnum('price_basis', [
		'quantity',
		'length',
		'width',
		'thickness',
		'color',
		'weight',
		'area'
	])
		.notNull()
		.default('quantity'),
	price: decimal('price', { precision: 10, scale: 2 }),
	// Snapshotted from variantPrices.priceIncludesVat — determines whether the
	// whole-order price offer adds 15% on top of this line or not.
	priceIncludesVat: boolean('price_includes_vat').notNull().default(false),
	amount: varchar('amount', { length: 255 }).notNull(),
	// Suggested catalog variant closest to the requested spec — no longer the
	// authoritative source, just a hint for staff during negotiation.
	variantId: int('variant_id').references(() => productVariants.id),
	...secureFields
});

export const promoCodes = mysqlTable('promo_codes', {
	id: int('id').primaryKey().autoincrement(),
	code: varchar('code', { length: 50 }).notNull().unique(),
	discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }).notNull(),
	reason: varchar('reason', { length: 255 }), // e.g. "New Year promo", "reseller partner"
	startsAt: timestamp('starts_at'),
	expiresAt: timestamp('expires_at'),
	maxUses: int('max_uses'), // nullable: unlimited if not set
	timesUsed: int('times_used').notNull().default(0),
	...secureFields
});

// A sales negotiation on an order can go through several rounds — each round
// is its own row here (bumping `revision`), and `status` marks which one the
// customer actually accepted. One offer covers the WHOLE order (every line in
// orderItems), not a single product — the per-line spec/price already lives
// on orderItems itself; this table is the resulting financial envelope.
export const priceOffers = mysqlTable(
	'price_offers',
	{
		id: int('id').primaryKey().autoincrement(),
		orderId: int('order_id')
			.notNull()
			.references(() => orders.id, { onDelete: 'cascade' }),
		revision: int('revision').notNull().default(1),
		staffId: int('staff_id').references(() => staff.id), // salesperson who made the offer

		// Sum of every order line's VAT-exclusive amount, before discount. Lines
		// priced from a variantPrices rate that already includes VAT still
		// contribute their VAT-exclusive equivalent here (backed out at 15%) so
		// this figure is always a clean pre-tax number.
		subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),

		// Sales person's negotiated discount off the subtotal, plus an optional
		// promo code stacked on top. Applied proportionally to both the
		// VAT-exclusive and VAT-inclusive totals below.
		discountPercentage: decimal('discount_percentage', { precision: 5, scale: 2 }),
		discountAmount: decimal('discount_amount', { precision: 12, scale: 2 }),
		promoCodeId: int('promo_code_id').references(() => promoCodes.id, { onDelete: 'set null' }),

		// The two headline figures the sales person actually needs to quote —
		// computed per-line (lines already VAT-inclusive don't get 15% added
		// again) then summed, after discount.
		priceExcludingVat: decimal('price_excluding_vat', { precision: 12, scale: 2 }).notNull(),
		vatRate: decimal('vat_rate', { precision: 5, scale: 2 }).notNull().default('15.00'),
		vatAmount: decimal('vat_amount', { precision: 12, scale: 2 }).notNull(),
		priceIncludingVat: decimal('price_including_vat', { precision: 12, scale: 2 }).notNull(),

		withholdingRate: decimal('withholding_rate', { precision: 5, scale: 2 })
			.notNull()
			.default('3.00'),
		withholdingAmount: decimal('withholding_amount', { precision: 12, scale: 2 }),
		// Final payable figure: priceIncludingVat minus withholdingAmount.
		total: decimal('total', { precision: 12, scale: 2 }).notNull(),

		paymentTerms: varchar('payment_terms', { length: 255 }), // free text — no fixed set of terms
		validityDays: int('validity_days'), // how many days this offer stays valid for
		// % of total due upfront before the rest is invoiced/delivered — most
		// clients still pay in full, hence the 100 default.
		advancePaymentPercentage: decimal('advance_payment_percentage', { precision: 5, scale: 2 })
			.notNull()
			.default('100.00'),

		status: mysqlEnum('status', ['pending', 'accepted', 'rejected']).notNull().default('pending'),
		...secureFields
	},
	(table) => [uniqueIndex('price_offers_order_revision_unique').on(table.orderId, table.revision)]
);

// Post-dispatch correction to an order's total — e.g. a shortfall found on
// delivery, a damaged item credited back, a freight surcharge missed at
// invoicing. Each row is one line of adjustment; the order's true total is
// the accepted priceOffers.total plus/minus every approved row here.
export const orderAdjustments = mysqlTable('order_adjustments', {
	id: int('id').primaryKey().autoincrement(),
	orderId: int('order_id')
		.notNull()
		.references(() => orders.id, { onDelete: 'cascade' }),
	type: mysqlEnum('type', ['deduction', 'addition']).notNull(),
	amount: decimal('amount', { precision: 12, scale: 2 }).notNull(), // always positive; direction comes from `type`
	reason: varchar('reason', { length: 255 }).notNull(),
	notes: text('notes'), // longer explanation if reason alone isn't enough
	causedBy: mysqlEnum('caused_by', ['customer', 'company']).notNull(), // whose error/request this corrects — matters for accounting/blame tracking

	// Adjustments touch real money, so they go through the same approval gate
	// as a price offer before they're allowed to change what's owed.
	status: mysqlEnum('status', ['pending', 'approved', 'rejected']).notNull().default('pending'),
	approvedBy: varchar('approved_by', { length: 255 }).references(() => user.id, {
		onDelete: 'set null'
	}),
	approvedAt: timestamp('approved_at'),

	// Once approved and actually settled (refund issued / extra charge paid),
	// link the transaction that moved the money.
	transactionId: int('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),

	...secureFields
});

export const damagedProducts = mysqlTable('damaged_products', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id')
		.notNull()
		.references(() => products.id, { onDelete: 'cascade' }),
	quantity: int('quantity').notNull(),
	damagedBy: varchar('damaged_by', { length: 36 }).notNull(),
	reason: varchar('reason', { length: 255 }).notNull(),
	...secureFields
});



export const warehouses = mysqlTable('warehouses', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 150 }).notNull(),
	location: varchar('location', { length: 255 }),
	isDefault: boolean('is_default').default(false),
	...secureFields
});
 
export const stockLevels = mysqlTable('stock_levels', {
	id: int('id').primaryKey().autoincrement(),
	variantId: int('variant_id')
		.notNull()
		.references(() => productVariants.id, { onDelete: 'cascade' }),
	warehouseId: int('warehouse_id')
		.notNull()
		.references(() => warehouses.id, { onDelete: 'cascade' }),
	quantity: int('quantity').notNull().default(0)
});
 
export const staff = mysqlTable('staff', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 150 }).notNull(),
	role: varchar('role', { length: 100 }), // e.g. "Warehouse Supervisor", "Machine Operator"
	phone: varchar('phone', { length: 20 }),
	userId: varchar('user_id', { length: 255 }), // nullable FK to auth.user, only if/when they get login access
	...secureFields
});

 
export const rawMaterials = mysqlTable('raw_materials', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 150 }).notNull(), // e.g. "Cold Rolled Coil"
	supplierId: int('supplier_id').references(() => productSuppliers.id),
	unit: mysqlEnum('unit', ['kg', 'ton', 'm', 'coil']).notNull().default('ton'),
	quantityOnHand: decimal('quantity_on_hand', { precision: 12, scale: 3 }).notNull().default('0'),
	reorderLevel: decimal('reorder_level', { precision: 12, scale: 3 }),
	...secureFields
});
 
export const productionBatches = mysqlTable('production_batches', {
	id: int('id').primaryKey().autoincrement(),
	batchNumber: varchar('batch_number', { length: 100 }).notNull().unique(), // for traceability / mill certs
	variantId: int('variant_id')
		.notNull()
		.references(() => productVariants.id),
	rawMaterialId: int('raw_material_id').references(() => rawMaterials.id),
	rawMaterialConsumed: decimal('raw_material_consumed', { precision: 12, scale: 3 }),
	quantityProduced: int('quantity_produced').notNull(),
	scrapQuantity: decimal('scrap_quantity', { precision: 12, scale: 3 }), // waste/offcuts — matters for cost + reporting
	producedBy: int('produced_by').references(() => staff.id),
	warehouseId: int('warehouse_id').references(() => warehouses.id), // where output landed
	productionDate: date('production_date').notNull(),
	...secureFields
});

 
export const purchaseOrders = mysqlTable('purchase_orders', {
	id: int('id').primaryKey().autoincrement(),
	supplierId: int('supplier_id')
		.notNull()
		.references(() => productSuppliers.id),
	status: mysqlEnum('status', ['draft', 'ordered', 'in_transit', 'received', 'cancelled'])
		.default('draft'),
	expectedDate: date('expected_date'),
	receivedDate: date('received_date'),
	raisedBy: int('raised_by').references(() => staff.id),
	notes: text('notes'),
	...secureFields
});
 
export const purchaseOrderItems = mysqlTable('purchase_order_items', {
	id: int('id').primaryKey().autoincrement(),
	purchaseOrderId: int('purchase_order_id')
		.notNull()
		.references(() => purchaseOrders.id, { onDelete: 'cascade' }),
	rawMaterialId: int('raw_material_id').references(() => rawMaterials.id),
	variantId: int('variant_id').references(() => productVariants.id), // for buying finished goods too, not just raw coil
	quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull(),
	unitCost: decimal('unit_cost', { precision: 10, scale: 2 })
});



// A quote request is the customer's inquiry envelope — the actual products
// being asked about are a whole order's worth of lines, not a single
// product/variant (that was the old design: one quoteRequests row per
// product, which fell apart the moment a customer wanted more than one
// item). `orderId` is the cart/order this inquiry is for; the real line
// items — product, spec, quantity — live on that order's orderItems.
export const quoteRequests = mysqlTable('quote_requests', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	email: varchar('email', { length: 100 }),
	phone: varchar('phone', { length: 20 }).notNull(),
	whatsapp: varchar('whatsapp', { length: 20 }),
	companyName: varchar('company_name', { length: 255 }),

	customerId: int('customer_id').references(() => customers.id, { onDelete: 'set null' }), // link if requester is an existing customer
	orderId: int('order_id').references(() => orders.id, { onDelete: 'set null' }), // the whole cart/order this quote is for
	message: text('message'),

	status: mysqlEnum('status', ['new', 'contacted', 'quoted', 'converted', 'lost']).default(
		'new'
	),
	seen: boolean('seen').default(false),

	...secureFields
});

export const quoteReplies = mysqlTable('quote_replies', {
	id: int('id').primaryKey().autoincrement(),
	quoteRequestId: int('quote_request_id')
		.notNull()
		.references(() => quoteRequests.id, { onDelete: 'cascade' }),
	subject: varchar('subject', { length: 255 }).notNull(),
	message: text('message').notNull(), // the rich-text email body sent to the customer

	// Which whole-order price offer (see priceOffers) this reply communicated —
	// not every reply is a priced one (e.g. "we're reviewing your request").
	priceOfferId: int('price_offer_id').references(() => priceOffers.id, { onDelete: 'set null' }),

	// Set once this reply's price results in a real order + payment link being sent
	orderId: int('order_id').references(() => orders.id, { onDelete: 'set null' }),

	// Optional — who on staff sent it. Nullable since your reference project's
	// reply form doesn't track this either; adjust/drop if you don't need it.
	repliedByUserId: varchar('replied_by_user_id', { length: 255 }).references(() => user.id),

	...secureFields
});
export const contactMessages = mysqlTable('contact_messages', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	email: varchar('email', { length: 100 }).notNull(),
	phone: varchar('phone', { length: 20 }),
	subject: varchar('subject', { length: 255 }).notNull(),
	address: varchar('address', { length: 255 }),
	message: text('message').notNull(),
	seen: boolean('seen').default(false),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const gallery = mysqlTable('gallery', {
	id: int('id').primaryKey().autoincrement(),
	imageUrl: varchar('image_url', { length: 255 }),
	category: mysqlEnum('category', ['factory', 'products', 'projects', 'team']).default('factory')
});

/**
 * Every editable image on the public site.
 *
 * A row is one image belonging to a `slot` — a stable key from
 * SITE_IMAGE_SLOTS in `$lib/siteImages`. Single-image slots hold at most one
 * row; gallery slots hold many, ordered by `sortOrder`.
 *
 * A slot with NO rows falls back to the bundled static default declared in the
 * registry, so the site renders correctly on a fresh database and "reset to
 * default" is just a DELETE.
 *
 * `imageUrl` is the file name returned by saveUploadedFile (served from
 * /files/<name>). Values starting with "/" are passed through as-is, so a slot
 * can also point at a bundled static asset.
 */
export const siteImages = mysqlTable(
	'site_images',
	{
		id: int('id').primaryKey().autoincrement(),
		slot: varchar('slot', { length: 100 }).notNull(),
		imageUrl: varchar('image_url', { length: 255 }).notNull(),
		alt: varchar('alt', { length: 255 }),
		sortOrder: int('sort_order').default(0).notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(table) => [index('site_images_slot_idx').on(table.slot, table.sortOrder)]
);

export const testimonials = mysqlTable('testimonials', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	position: varchar('position', { length: 255 }),
	message: text('message').notNull(),
	avatar: varchar('avatar', { length: 255 }),
	isApproved: boolean('is_approved').default(false), // gate: brief says do not publish until client approves
	...secureFields
});

export * from './auth.schema';


export const paymentLinks = mysqlTable('payment_links', {
	id: int('id').primaryKey().autoincrement(),
	orderId: int('order_id')
		.notNull()
		.references(() => orders.id, { onDelete: 'cascade' }),
	tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(), // sha256 hex digest
	expiresAt: timestamp('expires_at').notNull(),
	usedAt: timestamp('used_at'), // set only once payment is CONFIRMED via server-to-server verify
	createdAt: timestamp('created_at').defaultNow().notNull()
});