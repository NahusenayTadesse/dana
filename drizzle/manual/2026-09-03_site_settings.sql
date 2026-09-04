-- Admin-editable company details (phones, emails, social links).
-- An absent key falls back to the default declared in src/lib/siteSettings.ts;
-- a row holding '' means the operator deliberately cleared an optional field.
CREATE TABLE IF NOT EXISTS `site_settings` (
	`id` int NOT NULL AUTO_INCREMENT,
	`setting_key` varchar(100) NOT NULL,
	`setting_value` varchar(500) NOT NULL,
	`updated_by` varchar(255),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_settings_setting_key_unique` UNIQUE(`setting_key`)
);
