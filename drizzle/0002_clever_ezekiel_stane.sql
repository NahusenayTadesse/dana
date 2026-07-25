CREATE TABLE `colors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`code` varchar(50),
	`hex_value` varchar(7),
	`swatch_image` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `colors_id` PRIMARY KEY(`id`),
	CONSTRAINT `colors_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `lengths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`unit` enum('mm','m','ft') NOT NULL DEFAULT 'm',
	`label` varchar(50),
	`is_custom` boolean DEFAULT false,
	`is_active` boolean DEFAULT true,
	CONSTRAINT `lengths_id` PRIMARY KEY(`id`),
	CONSTRAINT `lengths_value_unit_unique` UNIQUE(`value`,`unit`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`color_id` int,
	`width_id` int,
	`thickness_id` int,
	`length_id` int,
	`sku` varchar(100),
	`price` decimal(10,2),
	`quantity` int NOT NULL DEFAULT 0,
	`reorder_level` int,
	`image_url` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_sku_unique` UNIQUE(`sku`),
	CONSTRAINT `product_variant_spec_unique` UNIQUE(`product_id`,`color_id`,`width_id`,`thickness_id`,`length_id`)
);
--> statement-breakpoint
CREATE TABLE `production_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_number` varchar(100) NOT NULL,
	`variant_id` int NOT NULL,
	`raw_material_id` int,
	`raw_material_consumed` decimal(12,3),
	`quantity_produced` int NOT NULL,
	`scrap_quantity` decimal(12,3),
	`produced_by` int,
	`warehouse_id` int,
	`production_date` date NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `production_batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `production_batches_batch_number_unique` UNIQUE(`batch_number`)
);
--> statement-breakpoint
CREATE TABLE `purchase_order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchase_order_id` int NOT NULL,
	`raw_material_id` int,
	`variant_id` int,
	`quantity` decimal(12,3) NOT NULL,
	`unit_cost` decimal(10,2),
	CONSTRAINT `purchase_order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplier_id` int NOT NULL,
	`status` enum('draft','ordered','in_transit','received','cancelled') DEFAULT 'draft',
	`expected_date` date,
	`received_date` date,
	`raised_by` int,
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `purchase_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `raw_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`supplier_id` int,
	`unit` enum('kg','ton','m','coil') NOT NULL DEFAULT 'ton',
	`quantity_on_hand` decimal(12,3) NOT NULL DEFAULT '0',
	`reorder_level` decimal(12,3),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `raw_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`role` varchar(100),
	`phone` varchar(20),
	`user_id` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `staff_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `stock_levels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`variant_id` int NOT NULL,
	`warehouse_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	CONSTRAINT `stock_levels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `thicknesses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`value` decimal(10,3) NOT NULL,
	`unit` enum('mm','gauge') NOT NULL DEFAULT 'mm',
	`label` varchar(50),
	`is_active` boolean DEFAULT true,
	CONSTRAINT `thicknesses_id` PRIMARY KEY(`id`),
	CONSTRAINT `thicknesses_value_unit_unique` UNIQUE(`value`,`unit`)
);
--> statement-breakpoint
CREATE TABLE `warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`location` varchar(255),
	`is_default` boolean DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `warehouses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `widths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`unit` enum('mm','cm','m','in','ft') NOT NULL DEFAULT 'mm',
	`label` varchar(50),
	`is_active` boolean DEFAULT true,
	CONSTRAINT `widths_id` PRIMARY KEY(`id`),
	CONSTRAINT `widths_value_unit_unique` UNIQUE(`value`,`unit`)
);
--> statement-breakpoint
ALTER TABLE `order_items` MODIFY COLUMN `price` decimal(10,2);--> statement-breakpoint
ALTER TABLE `customers` ADD `type` enum('individual','company') DEFAULT 'individual';--> statement-breakpoint
ALTER TABLE `order_items` ADD `variant_id` int;--> statement-breakpoint
ALTER TABLE `colors` ADD CONSTRAINT `colors_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `colors` ADD CONSTRAINT `colors_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `colors` ADD CONSTRAINT `colors_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_color_id_colors_id_fk` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_width_id_widths_id_fk` FOREIGN KEY (`width_id`) REFERENCES `widths`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_thickness_id_thicknesses_id_fk` FOREIGN KEY (`thickness_id`) REFERENCES `thicknesses`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_length_id_lengths_id_fk` FOREIGN KEY (`length_id`) REFERENCES `lengths`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_raw_material_id_raw_materials_id_fk` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_produced_by_staff_id_fk` FOREIGN KEY (`produced_by`) REFERENCES `staff`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `production_batches` ADD CONSTRAINT `production_batches_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_purchase_order_id_purchase_orders_id_fk` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_raw_material_id_raw_materials_id_fk` FOREIGN KEY (`raw_material_id`) REFERENCES `raw_materials`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_product_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `product_suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_raised_by_staff_id_fk` FOREIGN KEY (`raised_by`) REFERENCES `staff`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_supplier_id_product_suppliers_id_fk` FOREIGN KEY (`supplier_id`) REFERENCES `product_suppliers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `raw_materials` ADD CONSTRAINT `raw_materials_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_warehouse_id_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `warehouses` ADD CONSTRAINT `warehouses_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE no action ON UPDATE no action;