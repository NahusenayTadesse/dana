CREATE TABLE `quote_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quote_request_id` int NOT NULL,
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`quoted_unit_price` decimal(10,2),
	`quoted_quantity` int,
	`order_id` int,
	`replied_by_user_id` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(255),
	`updated_by` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(255),
	CONSTRAINT `quote_replies_id` PRIMARY KEY(`id`)
);

ALTER TABLE `quote_replies` ADD CONSTRAINT `quote_replies_quote_request_id_quote_requests_id_fk` FOREIGN KEY (`quote_request_id`) REFERENCES `quote_requests`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `quote_replies` ADD CONSTRAINT `quote_replies_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `quote_replies` ADD CONSTRAINT `quote_replies_replied_by_user_id_user_id_fk` FOREIGN KEY (`replied_by_user_id`) REFERENCES `user`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `quote_replies` ADD CONSTRAINT `quote_replies_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `quote_replies` ADD CONSTRAINT `quote_replies_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `quote_replies` ADD CONSTRAINT `quote_replies_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;