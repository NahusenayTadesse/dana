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

	// Technical specifications
	thickness: varchar('thickness', { length: 100 }), // e.g. range in mm
	width: varchar('width', { length: 100 }),
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

export const prices = mysqlTable('prices', {
	id: int('id').primaryKey().autoincrement(),
	productId: int('product_id').references(() => products.id, { onDelete: 'cascade' }),
	price: decimal('price', { precision: 10, scale: 2 }).notNull(),
	variant: varchar('variant', { length: 255 }).notNull(),
	imageUrl: varchar('image_url', { length: 255 })	
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
}, (table) => ({
	uniqueValue: uniqueIndex('widths_value_unit_unique').on(table.value, table.unit)
}));



 
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
		.notNull()
		.references(() => user.id),
	address: varchar('address', { length: 255 }),
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
	amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
	txnRef: varchar('txn_ref', { length: 255 }),
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
	transactionId: int('transaction_id').references(() => transactions.id),
	...secureFields
});

export const orderItems = mysqlTable('order_items', {
	id: int('id').autoincrement().primaryKey(),
	orderId: int('order_id').references(() => orders.id),
	productId: int('product_id').references(() => products.id),
	quantity: int('quantity').notNull(),
	price: decimal('price', { precision: 10, scale: 2 }),
	amount: varchar('amount', { length: 255 }).notNull(),
	variantId: int('variant_id').references(() => productVariants.id),
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



export const quoteRequests = mysqlTable('quote_requests', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 255 }).notNull(),
	email: varchar('email', { length: 100 }),
	phone: varchar('phone', { length: 20 }).notNull(),
	whatsapp: varchar('whatsapp', { length: 20 }),
	companyName: varchar('company_name', { length: 255 }),

	customerId: int('customer_id').references(() => customers.id, { onDelete: 'set null' }), // link if requester is an existing customer
	productId: int('product_id').references(() => products.id, { onDelete: 'set null' }),
	categoryId: int('category_id').references(() => productCategories.id, {
		onDelete: 'set null'
	}),
	quantityEstimate: varchar('quantity_estimate', { length: 100 }),
	message: text('message'),

	status: mysqlEnum('status', ['new', 'contacted', 'quoted', 'converted', 'lost']).default(
		'new'
	),
	orderId: int('order_id').references(() => orders.id, { onDelete: 'set null' }), // set once quote converts into a real order
	seen: boolean('seen').default(false),
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