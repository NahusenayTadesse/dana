-- Admin-editable FAQ. With no rows the About page renders the nine questions
-- declared in src/lib/faqItems.ts, so an empty table is the site as it ships.
CREATE TABLE IF NOT EXISTS `faq_items` (
	`id` int NOT NULL AUTO_INCREMENT,
	`sort_order` int NOT NULL DEFAULT 0,
	`icon` varchar(40) NOT NULL,
	`question_en` varchar(255) NOT NULL,
	`question_am` varchar(255),
	`answer_en` text NOT NULL,
	`answer_am` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `faq_items_id` PRIMARY KEY(`id`)
);
CREATE INDEX `faq_items_order_idx` ON `faq_items` (`sort_order`);
