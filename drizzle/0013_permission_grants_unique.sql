-- Drop duplicate grants (keep the oldest) before the unique indexes.
DELETE a FROM `role_permissions` a
JOIN `role_permissions` b
	ON b.`role_id` = a.`role_id` AND b.`permission_id` = a.`permission_id` AND b.`id` < a.`id`;
--> statement-breakpoint
DELETE a FROM `special_permissions` a
JOIN `special_permissions` b
	ON b.`user_id` = a.`user_id` AND b.`permission_id` = a.`permission_id` AND b.`id` < a.`id`;
--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_permission_unique` UNIQUE(`role_id`,`permission_id`);--> statement-breakpoint
ALTER TABLE `special_permissions` ADD CONSTRAINT `special_permissions_user_permission_unique` UNIQUE(`user_id`,`permission_id`);