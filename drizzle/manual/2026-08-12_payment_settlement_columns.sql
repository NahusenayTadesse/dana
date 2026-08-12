-- ============================================================================
-- Production catch-up: transactions.amount_paid + transactions.settled_txn_ref
-- ============================================================================
--
-- WHY: the local dev database was found two migrations behind (0010, 0011) and
-- BOTH columns are load-bearing for payment settlement. settlePaymentAttempt()
-- writes to them on every Chapa payment, so without them the settlement query
-- fails with "Unknown column" — the customer is charged, the order never leaves
-- `pending`, the payment links are never burned, and no confirmation is sent.
-- Verify production before assuming it is fine:
--
--   SHOW COLUMNS FROM `transactions` LIKE 'amount\_paid';
--   SHOW COLUMNS FROM `transactions` LIKE 'settled\_txn\_ref';
--
-- PREFER `npx drizzle-kit migrate`, which applies 0010 and 0011 and records
-- them properly. This file exists for environments where the CLI can't be
-- pointed at the production database. It is equivalent to those two migrations
-- plus their journal bookkeeping.
--
-- SAFE TO RE-RUN. Each step is guarded against information_schema, and the
-- backfills only run when this script is the thing that created the column —
-- re-running must never overwrite an amount_paid that has since accumulated
-- real payments.
--
-- Take a backup first:
--   mysqldump -u USER -p DBNAME > dana-before-payment-columns.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0010_nasty_master_mold — transactions.amount_paid
-- ---------------------------------------------------------------------------
-- Cumulative total actually confirmed by a server-to-server Chapa verify. Only
-- ever moves up. This and `amount` were the same column once, which meant
-- starting (and abandoning) a balance payment overwrote the record of the
-- advance already collected, and the order was re-invoiced for the wrong
-- remainder.

SET @add_amount_paid := (
  SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'amount_paid'
);

SET @sql := IF(@add_amount_paid,
  'ALTER TABLE `transactions` ADD `amount_paid` decimal(10,2) NOT NULL DEFAULT ''0''',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: before this column existed, `amount` doubled as the record of what
-- had been collected. For any transaction already settled, that value IS the
-- collected amount. Without this, every historically paid order would read as
-- amount_paid = 0 and be re-invoiced in full.
SET @sql := IF(@add_amount_paid,
  'UPDATE `transactions` SET `amount_paid` = `amount`
     WHERE `payment_status` IN (''paid'', ''partially_paid'', ''overpaid'')',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- 0011_aromatic_iron_man — transactions.settled_txn_ref
-- ---------------------------------------------------------------------------
-- The txn_ref of the attempt that was last successfully settled. Doubles as the
-- settlement mutex: settling is a conditional UPDATE that only matches when
-- this differs from the ref being settled, so the Chapa webhook and the
-- customer's return visit can race and still settle (and email) exactly once.

SET @add_settled_ref := (
  SELECT COUNT(*) = 0 FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'settled_txn_ref'
);

SET @sql := IF(@add_settled_ref,
  'ALTER TABLE `transactions` ADD `settled_txn_ref` varchar(255) NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: an already-settled transaction's current txn_ref is the attempt
-- that settled it. Without this, the first visit to an old paid order's payment
-- link after deploy would re-settle it and re-send the confirmation email.
SET @sql := IF(@add_settled_ref,
  'UPDATE `transactions` SET `settled_txn_ref` = `txn_ref`
     WHERE `payment_status` IN (''paid'', ''partially_paid'', ''overpaid'')
       AND `txn_ref` IS NOT NULL',
  'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ---------------------------------------------------------------------------
-- Journal bookkeeping
-- ---------------------------------------------------------------------------
-- Record 0010 and 0011 as applied so a later `drizzle-kit migrate` does not try
-- to re-run them and fail on a duplicate column. The hashes are the sha256 of
-- the migration files; created_at values are their `when` from
-- drizzle/meta/_journal.json — drizzle decides what is pending by comparing
-- against the newest created_at, so these must match exactly.

CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `hash` text NOT NULL,
  `created_at` bigint DEFAULT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `__drizzle_migrations` (`hash`, `created_at`)
SELECT 'f8c944e0bfa386db851c5c9a3574e0f53dbb2df01187db37fa44d42af3db5ea1', 1786351926081
WHERE NOT EXISTS (
  SELECT 1 FROM `__drizzle_migrations`
  WHERE `hash` = 'f8c944e0bfa386db851c5c9a3574e0f53dbb2df01187db37fa44d42af3db5ea1'
);

INSERT INTO `__drizzle_migrations` (`hash`, `created_at`)
SELECT 'bf314cacfc4abe542953ab9dc9eafebff2b77c31c735d33e0979a8cc216760b4', 1786352009931
WHERE NOT EXISTS (
  SELECT 1 FROM `__drizzle_migrations`
  WHERE `hash` = 'bf314cacfc4abe542953ab9dc9eafebff2b77c31c735d33e0979a8cc216760b4'
);

-- ---------------------------------------------------------------------------
-- Verify
-- ---------------------------------------------------------------------------
SELECT
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions'
      AND COLUMN_NAME = 'amount_paid')     AS has_amount_paid,
  (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions'
      AND COLUMN_NAME = 'settled_txn_ref') AS has_settled_txn_ref,
  (SELECT COUNT(*) FROM `__drizzle_migrations`) AS migrations_recorded;
-- Expect: 1, 1, 12
