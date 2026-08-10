ALTER TABLE `transactions` ADD `settled_txn_ref` varchar(255);
--> statement-breakpoint
-- Backfill: an already-settled transaction's current txn_ref is the attempt
-- that settled it. Without this, the first post-deploy visit to an old paid
-- order's payment link would re-settle it and re-send the confirmation email.
UPDATE `transactions`
SET `settled_txn_ref` = `txn_ref`
WHERE `payment_status` IN ('paid', 'partially_paid', 'overpaid')
  AND `txn_ref` IS NOT NULL;
