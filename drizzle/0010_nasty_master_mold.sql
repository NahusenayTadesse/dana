ALTER TABLE `transactions` ADD `amount_paid` decimal(10,2) DEFAULT '0' NOT NULL;
--> statement-breakpoint
-- Backfill: before this column existed, `amount` doubled as the record of what
-- had been collected. For any transaction already settled, that value IS the
-- collected amount, so carry it across. Without this, every historically paid
-- order would read as amount_paid = 0 on deploy and be re-invoiced in full.
UPDATE `transactions`
SET `amount_paid` = `amount`
WHERE `payment_status` IN ('paid', 'partially_paid', 'overpaid');
