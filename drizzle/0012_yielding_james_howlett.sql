CREATE TABLE IF NOT EXISTS `faq_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`icon` varchar(40) NOT NULL,
	`question_en` varchar(255) NOT NULL,
	`question_am` varchar(255),
	`answer_en` text NOT NULL,
	`answer_am` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `faq_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
-- faq_items / site_images / site_settings were created with `db:push` before
-- they had a migration, so they already exist on live databases. IF NOT EXISTS
-- keeps this migration safe there while still creating them on a fresh DB.
CREATE TABLE IF NOT EXISTS `site_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slot` varchar(100) NOT NULL,
	`image_url` varchar(255) NOT NULL,
	`alt` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_images_id` PRIMARY KEY(`id`),
	INDEX `site_images_slot_idx` (`slot`,`sort_order`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` varchar(500) NOT NULL,
	`updated_by` varchar(255),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_setting_key_unique` UNIQUE(`setting_key`)
);
--> statement-breakpoint
ALTER TABLE `discounts` DROP INDEX `discounts_name_unique`;--> statement-breakpoint
ALTER TABLE `blog_gallery` DROP FOREIGN KEY `blog_gallery_blog_id_blog_id_fk`;
--> statement-breakpoint
ALTER TABLE `orders` ADD `stock_deducted_at` datetime;--> statement-breakpoint
ALTER TABLE `purchase_orders` ADD `stock_received_at` datetime;--> statement-breakpoint
-- Merge any duplicate (variant, warehouse) stock rows before the unique index.
UPDATE `stock_levels` s
JOIN (
	SELECT MIN(`id`) AS keep_id, `variant_id`, `warehouse_id`, SUM(`quantity`) AS total
	FROM `stock_levels` GROUP BY `variant_id`, `warehouse_id` HAVING COUNT(*) > 1
) d ON s.`id` = d.keep_id
SET s.`quantity` = d.total;
--> statement-breakpoint
DELETE s FROM `stock_levels` s
JOIN `stock_levels` k
	ON k.`variant_id` = s.`variant_id` AND k.`warehouse_id` = s.`warehouse_id` AND k.`id` < s.`id`;
--> statement-breakpoint
ALTER TABLE `stock_levels` ADD CONSTRAINT `stock_levels_variant_warehouse_unique` UNIQUE(`variant_id`,`warehouse_id`);--> statement-breakpoint
ALTER TABLE `blog_gallery` ADD CONSTRAINT `blog_gallery_blog_id_blog_id_fk` FOREIGN KEY (`blog_id`) REFERENCES `blog`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- ── Warehouse-based stock backfill ─────────────────────────────────────────
-- stock_levels becomes the source of truth; product_variants.quantity and
-- products.quantity are kept as totals of it. Until now stock was typed straight
-- into product_variants.quantity, so move those numbers into a default warehouse
-- rather than zeroing every variant.
INSERT INTO `warehouses` (`name`, `is_default`, `is_active`)
SELECT 'Main Warehouse', true, true
WHERE NOT EXISTS (SELECT 1 FROM `warehouses` WHERE `is_default` = true);
--> statement-breakpoint
-- Variants with no warehouse rows at all carry their current quantity into the default warehouse.
INSERT INTO `stock_levels` (`variant_id`, `warehouse_id`, `quantity`)
SELECT v.`id`, (SELECT MIN(`id`) FROM `warehouses` WHERE `is_default` = true), v.`quantity`
FROM `product_variants` v
WHERE v.`quantity` <> 0
  AND NOT EXISTS (SELECT 1 FROM `stock_levels` s WHERE s.`variant_id` = v.`id`);
--> statement-breakpoint
UPDATE `product_variants` v
SET v.`quantity` = (SELECT COALESCE(SUM(s.`quantity`), 0) FROM `stock_levels` s WHERE s.`variant_id` = v.`id`);
--> statement-breakpoint
UPDATE `products` p
SET p.`quantity` = (SELECT COALESCE(SUM(v.`quantity`), 0) FROM `product_variants` v WHERE v.`product_id` = p.`id`);
--> statement-breakpoint
-- Orders delivered before stock was automated never had stock taken out, so
-- `stock_deducted_at` stays NULL for them: cancelling one later restores nothing.
-- POs already received are marked as applied so they can't be received again.
UPDATE `purchase_orders` SET `stock_received_at` = `updated_at` WHERE `status` = 'received';
