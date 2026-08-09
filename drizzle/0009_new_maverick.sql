ALTER TABLE `products` ADD `is_length_customizable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `products` ADD `min_length` decimal(10,2);--> statement-breakpoint
ALTER TABLE `products` ADD `length_step` decimal(10,2);