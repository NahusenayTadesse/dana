ALTER TABLE `quote_requests` DROP FOREIGN KEY `quote_requests_product_id_products_id_fk`;

ALTER TABLE `quote_requests` DROP FOREIGN KEY `quote_requests_category_id_product_categories_id_fk`;

ALTER TABLE `quote_requests` DROP FOREIGN KEY `quote_requests_variant_id_product_variants_id_fk`;

ALTER TABLE `price_offers` MODIFY COLUMN `vat_amount` decimal(12,2) NOT NULL;
ALTER TABLE `order_items` ADD `weight` decimal(12,3);
ALTER TABLE `order_items` ADD `weight_unit` enum('kg','ton') DEFAULT 'kg';
ALTER TABLE `order_items` ADD `price_basis` enum('quantity','length','width','thickness','color','weight','area') DEFAULT 'quantity' NOT NULL;
ALTER TABLE `order_items` ADD `price_includes_vat` boolean DEFAULT false NOT NULL;
ALTER TABLE `price_offers` ADD `discount_amount` decimal(12,2);
ALTER TABLE `price_offers` ADD `price_excluding_vat` decimal(12,2) NOT NULL;
ALTER TABLE `price_offers` ADD `price_including_vat` decimal(12,2) NOT NULL;
ALTER TABLE `quote_replies` ADD `price_offer_id` int;
ALTER TABLE `quote_replies` ADD CONSTRAINT `quote_replies_price_offer_id_price_offers_id_fk` FOREIGN KEY (`price_offer_id`) REFERENCES `price_offers`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `price_offers` DROP COLUMN `variant_name`;
ALTER TABLE `price_offers` DROP COLUMN `quantity`;
ALTER TABLE `price_offers` DROP COLUMN `thickness`;
ALTER TABLE `price_offers` DROP COLUMN `thickness_unit`;
ALTER TABLE `price_offers` DROP COLUMN `width`;
ALTER TABLE `price_offers` DROP COLUMN `width_unit`;
ALTER TABLE `price_offers` DROP COLUMN `length`;
ALTER TABLE `price_offers` DROP COLUMN `length_unit`;
ALTER TABLE `price_offers` DROP COLUMN `weight`;
ALTER TABLE `price_offers` DROP COLUMN `weight_unit`;
ALTER TABLE `price_offers` DROP COLUMN `price_basis`;
ALTER TABLE `price_offers` DROP COLUMN `unit_price`;
ALTER TABLE `price_offers` DROP COLUMN `price_includes_vat`;
ALTER TABLE `quote_replies` DROP COLUMN `quoted_unit_price`;
ALTER TABLE `quote_replies` DROP COLUMN `quoted_quantity`;
ALTER TABLE `quote_requests` DROP COLUMN `product_id`;
ALTER TABLE `quote_requests` DROP COLUMN `category_id`;
ALTER TABLE `quote_requests` DROP COLUMN `quantity_estimate`;
ALTER TABLE `quote_requests` DROP COLUMN `variant_id`;