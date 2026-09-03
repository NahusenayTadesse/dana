-- Editable site imagery.
--
-- One row per image. `slot` is a registry key from SITE_IMAGE_SLOTS
-- ($lib/siteImages); single slots hold one row, gallery slots hold many
-- ordered by `sort_order`. A slot with no rows falls back to the bundled
-- static default, so this table starts empty and the site is unchanged.

CREATE TABLE IF NOT EXISTS `site_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slot` varchar(100) NOT NULL,
	`image_url` varchar(255) NOT NULL,
	`alt` varchar(255),
	`sort_order` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `site_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `site_images_slot_idx` ON `site_images` (`slot`,`sort_order`);
