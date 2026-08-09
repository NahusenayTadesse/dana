CREATE TABLE `order_adjustments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`type` enum('deduction','addition') NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` varchar(255) NOT NULL,
	`notes` text,
	`caused_by` enum('customer','company') NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`approved_by` varchar(255),
	`approved_at` timestamp,
	`transaction_id` int,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `order_adjustments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `price_offers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`revision` int NOT NULL DEFAULT 1,
	`staff_id` int,
	`variant_name` varchar(255),
	`quantity` int,
	`thickness` decimal(10,3),
	`thickness_unit` enum('mm','gauge') DEFAULT 'mm',
	`width` decimal(10,2),
	`width_unit` enum('mm','cm','m','in','ft') DEFAULT 'mm',
	`length` decimal(10,2),
	`length_unit` enum('mm','m','ft') DEFAULT 'm',
	`weight` decimal(12,3),
	`weight_unit` enum('kg','ton') DEFAULT 'kg',
	`price_basis` enum('quantity','thickness','width','length','weight','area','combined') NOT NULL DEFAULT 'combined',
	`unit_price` decimal(12,2) NOT NULL,
	`discount_percentage` decimal(5,2),
	`promo_code_id` int,
	`subtotal` decimal(12,2) NOT NULL,
	`price_includes_vat` boolean DEFAULT false,
	`vat_rate` decimal(5,2) NOT NULL DEFAULT '15.00',
	`vat_amount` decimal(12,2),
	`withholding_rate` decimal(5,2) NOT NULL DEFAULT '3.00',
	`withholding_amount` decimal(12,2),
	`total` decimal(12,2) NOT NULL,
	`payment_terms` varchar(255),
	`validity_days` int,
	`advance_payment_percentage` decimal(5,2) NOT NULL DEFAULT '100.00',
	`status` enum('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `price_offers_id` PRIMARY KEY(`id`),
	CONSTRAINT `price_offers_order_revision_unique` UNIQUE(`order_id`,`revision`)
);

CREATE TABLE `promo_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(50) NOT NULL,
	`discount_percentage` decimal(5,2) NOT NULL,
	`reason` varchar(255),
	`starts_at` timestamp,
	`expires_at` timestamp,
	`max_uses` int,
	`times_used` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `promo_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `promo_codes_code_unique` UNIQUE(`code`)
);

CREATE TABLE `variant_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`variant_id` int NOT NULL,
	`basis` enum('quantity','length','width','thickness','color','weight','area') NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`price_includes_vat` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `variant_prices_id` PRIMARY KEY(`id`),
	CONSTRAINT `variant_prices_variant_basis_unique` UNIQUE(`variant_id`,`basis`)
);

DROP TABLE `prices`;
ALTER TABLE `order_items` MODIFY COLUMN `quantity` int;
ALTER TABLE `customers` ADD `credit_limit` decimal(12,2);
ALTER TABLE `customers` ADD `credit_days` int;
ALTER TABLE `order_items` ADD `length` decimal(10,2);
ALTER TABLE `order_items` ADD `length_unit` enum('mm','m','ft') DEFAULT 'm';
ALTER TABLE `order_items` ADD `color_id` int;
ALTER TABLE `order_items` ADD `thickness` decimal(10,3);
ALTER TABLE `order_items` ADD `thickness_unit` enum('mm','gauge') DEFAULT 'mm';
ALTER TABLE `order_items` ADD `width` decimal(10,2);
ALTER TABLE `order_items` ADD `width_unit` enum('mm','cm','m','in','ft') DEFAULT 'mm';
ALTER TABLE `orders` ADD `request_status` enum('pending','approved','rejected') DEFAULT 'pending';
ALTER TABLE `orders` ADD `delivery_address` varchar(255);
ALTER TABLE `orders` ADD `delivery_date` date;
ALTER TABLE `orders` ADD `freight_cost` decimal(12,2);
ALTER TABLE `orders` ADD `freight_paid_by` enum('company','customer') DEFAULT 'customer';
ALTER TABLE `products` ADD `sold_by` enum('quantity','length','both') DEFAULT 'quantity' NOT NULL;
ALTER TABLE `products` ADD `max_length` decimal(10,2);
ALTER TABLE `products` ADD `max_length_unit` enum('mm','m','ft') DEFAULT 'm';
ALTER TABLE `order_adjustments` ADD CONSTRAINT `order_adjustments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `order_adjustments` ADD CONSTRAINT `order_adjustments_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `order_adjustments` ADD CONSTRAINT `order_adjustments_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `order_adjustments` ADD CONSTRAINT `order_adjustments_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `order_adjustments` ADD CONSTRAINT `order_adjustments_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `order_adjustments` ADD CONSTRAINT `order_adjustments_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `price_offers` ADD CONSTRAINT `price_offers_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `price_offers` ADD CONSTRAINT `price_offers_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `price_offers` ADD CONSTRAINT `price_offers_promo_code_id_promo_codes_id_fk` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `price_offers` ADD CONSTRAINT `price_offers_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `price_offers` ADD CONSTRAINT `price_offers_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `price_offers` ADD CONSTRAINT `price_offers_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `promo_codes` ADD CONSTRAINT `promo_codes_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `promo_codes` ADD CONSTRAINT `promo_codes_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `promo_codes` ADD CONSTRAINT `promo_codes_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `variant_prices` ADD CONSTRAINT `variant_prices_variant_id_product_variants_id_fk` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `variant_prices` ADD CONSTRAINT `variant_prices_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `variant_prices` ADD CONSTRAINT `variant_prices_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `variant_prices` ADD CONSTRAINT `variant_prices_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_color_id_colors_id_fk` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE set null ON UPDATE no action;