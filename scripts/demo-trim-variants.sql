-- ===========================================================================
-- Demo data trim: keep 2 variants per product, delete the rest, and delete
-- every order that referenced a deleted variant.
--
-- Target: MariaDB 11.x / MySQL 8.x, all tables InnoDB.
-- Written against the `dana` schema (product_variants, orders, order_items…).
--
-- READ FIRST
--   * This is destructive and there is no undo once you COMMIT.
--     Take a dump first:  mysqldump -u USER -p DBNAME > backup.sql
--   * It runs inside a transaction and ENDS WITH `ROLLBACK`. Nothing is
--     removed until you swap that final line for `COMMIT`.
--   * Run it as one script in one session — the TEMPORARY tables only exist
--     for the connection that created them.
--   * An order is deleted if ANY of its lines points at a deleted variant,
--     including lines that point at variants you are keeping.
--
-- Cascades this relies on (verified against information_schema on the live
-- schema — re-check if the demo DB's constraints differ):
--   product_variants -> variant_prices        CASCADE   (deleted for you)
--   product_variants -> stock_levels          CASCADE   (deleted for you)
--   product_variants -> quote_requests        SET NULL  (row kept, link cleared)
--   product_variants -> order_items           NO ACTION (deleted explicitly below)
--   product_variants -> production_batches    NO ACTION (deleted explicitly below)
--   product_variants -> purchase_order_items  NO ACTION (deleted explicitly below)
--   orders -> price_offers                    CASCADE   (deleted for you)
--   orders -> order_adjustments               CASCADE   (deleted for you)
--   orders -> payment_links                   CASCADE   (deleted for you)
--   orders -> order_items                     NO ACTION (deleted explicitly below)
--   orders -> quote_requests / quote_replies  SET NULL  (rows kept by default)
-- ===========================================================================

START TRANSACTION;

-- ---------------------------------------------------------------------------
-- 1. Which two variants survive per product
--
-- Ranked so the two keepers are, in order of preference: one from each of the
-- first two colours the product comes in (so a demo product still shows a
-- colour choice), preferring priced and in-stock rows, tie-broken by id.
-- A product that only comes in one colour keeps its two best rows instead.
--
-- Swap the ORDER BY on `rn` for `no_price, no_stock, id` if you would rather
-- just keep the two best variants regardless of colour.
-- ---------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS keep_variants;
CREATE TEMPORARY TABLE keep_variants (variant_id INT PRIMARY KEY) ENGINE = InnoDB;

INSERT INTO keep_variants (variant_id)
SELECT id
FROM (
	SELECT
		id,
		ROW_NUMBER() OVER (
			PARTITION BY product_id
			ORDER BY rn_in_color, no_price, no_stock, id
		) AS rn
	FROM (
		SELECT
			pv.id,
			pv.product_id,
			(pv.price IS NULL)   AS no_price,
			(pv.quantity <= 0)   AS no_stock,
			ROW_NUMBER() OVER (
				PARTITION BY pv.product_id, pv.color_id
				ORDER BY (pv.price IS NULL), (pv.quantity <= 0), pv.id
			) AS rn_in_color
		FROM product_variants pv
	) ranked_in_color
) ranked
WHERE rn <= 2;

-- ---------------------------------------------------------------------------
-- 2. Everything else goes
-- ---------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS doomed_variants;
CREATE TEMPORARY TABLE doomed_variants (variant_id INT PRIMARY KEY) ENGINE = InnoDB;

INSERT INTO doomed_variants (variant_id)
SELECT pv.id
FROM product_variants pv
LEFT JOIN keep_variants k ON k.variant_id = pv.id
WHERE k.variant_id IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Orders that touch a doomed variant
-- ---------------------------------------------------------------------------
DROP TEMPORARY TABLE IF EXISTS doomed_orders;
CREATE TEMPORARY TABLE doomed_orders (order_id INT PRIMARY KEY) ENGINE = InnoDB;

INSERT INTO doomed_orders (order_id)
SELECT DISTINCT oi.order_id
FROM order_items oi
JOIN doomed_variants d ON d.variant_id = oi.variant_id
WHERE oi.order_id IS NOT NULL;

-- Captured now, because deleting the orders sets quote_requests.order_id to
-- NULL and there is no way to tell afterwards which quotes belonged to them.
DROP TEMPORARY TABLE IF EXISTS doomed_quotes;
CREATE TEMPORARY TABLE doomed_quotes (quote_id INT PRIMARY KEY) ENGINE = InnoDB;

INSERT INTO doomed_quotes (quote_id)
SELECT q.id
FROM quote_requests q
JOIN doomed_orders o ON o.order_id = q.order_id;

-- ---------------------------------------------------------------------------
-- 4. PREVIEW — read this before committing
-- ---------------------------------------------------------------------------
SELECT
	(SELECT COUNT(*) FROM product_variants)  AS variants_now,
	(SELECT COUNT(*) FROM keep_variants)     AS variants_kept,
	(SELECT COUNT(*) FROM doomed_variants)   AS variants_deleted,
	(SELECT COUNT(*) FROM orders)            AS orders_now,
	(SELECT COUNT(*) FROM doomed_orders)     AS orders_deleted,
	(SELECT COUNT(*) FROM doomed_quotes)     AS quote_requests_affected;

-- Per product: what survives, and what it looks like.
SELECT
	p.id   AS product_id,
	p.name AS product,
	pv.id  AS variant_id,
	pv.sku,
	c.name AS color,
	pv.price,
	pv.quantity
FROM keep_variants k
JOIN product_variants pv ON pv.id = k.variant_id
JOIN products p          ON p.id = pv.product_id
LEFT JOIN colors c       ON c.id = pv.color_id
ORDER BY p.id, pv.id;

-- Any product that could not yield two keepers (it had fewer than two
-- variants to begin with). Empty result = every product keeps exactly two.
SELECT p.id, p.name, COUNT(k.variant_id) AS kept
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
LEFT JOIN keep_variants k     ON k.variant_id = pv.id
GROUP BY p.id, p.name
HAVING kept <> 2;

-- ---------------------------------------------------------------------------
-- 5. Delete, child rows first
-- ---------------------------------------------------------------------------

-- 5a. Lines of the doomed orders. order_items -> orders is NO ACTION, so the
--     orders cannot be deleted while these exist.
DELETE oi
FROM order_items oi
JOIN doomed_orders o ON o.order_id = oi.order_id;

-- 5b. Any line still pointing at a doomed variant — one with a NULL order_id,
--     which step 3 could not sweep into doomed_orders.
DELETE oi
FROM order_items oi
JOIN doomed_variants d ON d.variant_id = oi.variant_id;

-- 5c. The other two NO ACTION referrers of product_variants. Both are empty in
--     the current data, but a demo DB seeded later may not be.
DELETE pb
FROM production_batches pb
JOIN doomed_variants d ON d.variant_id = pb.variant_id;

DELETE poi
FROM purchase_order_items poi
JOIN doomed_variants d ON d.variant_id = poi.variant_id;

-- 5d. The orders. Cascades price_offers, order_adjustments and payment_links;
--     nulls quote_requests.order_id and quote_replies.order_id.
DELETE o
FROM orders o
JOIN doomed_orders d ON d.order_id = o.id;

-- 5e. The variants. Cascades variant_prices and stock_levels; nulls
--     quote_requests.variant_id.
DELETE pv
FROM product_variants pv
JOIN doomed_variants d ON d.variant_id = pv.id;

-- ---------------------------------------------------------------------------
-- 6. OPTIONAL cleanups — delete these two blocks if you want the rows kept
-- ---------------------------------------------------------------------------

-- 6a. Quote requests whose order has just been deleted. They would otherwise
--     survive with a dangling order_id of NULL. Cascades quote_replies.
DELETE q
FROM quote_requests q
JOIN doomed_quotes x ON x.quote_id = q.id;

-- 6b. Payment transactions nothing points at any more. Scoped to genuinely
--     unreferenced rows, so transactions belonging to surviving orders,
--     order adjustments or product adjustments are left alone.
DROP TEMPORARY TABLE IF EXISTS orphan_transactions;
CREATE TEMPORARY TABLE orphan_transactions (txn_id INT PRIMARY KEY) ENGINE = InnoDB;

INSERT INTO orphan_transactions (txn_id)
SELECT t.id
FROM transactions t
LEFT JOIN orders o              ON o.transaction_id  = t.id
LEFT JOIN order_adjustments oa  ON oa.transaction_id = t.id
LEFT JOIN product_adjustments pa ON pa.transaction_id = t.id
WHERE o.id IS NULL AND oa.id IS NULL AND pa.id IS NULL;

DELETE t
FROM transactions t
JOIN orphan_transactions x ON x.txn_id = t.id;

-- ---------------------------------------------------------------------------
-- 7. Verify — every product should now show exactly 2 (or fewer, if it never
--    had 2), and every count below should be 0.
-- ---------------------------------------------------------------------------
SELECT p.id, p.name, COUNT(pv.id) AS variants_remaining
FROM products p
LEFT JOIN product_variants pv ON pv.product_id = p.id
GROUP BY p.id, p.name
ORDER BY p.id;

SELECT
	(SELECT COUNT(*) FROM order_items oi
	   LEFT JOIN product_variants pv ON pv.id = oi.variant_id
	  WHERE oi.variant_id IS NOT NULL AND pv.id IS NULL)      AS orphan_order_items,
	(SELECT COUNT(*) FROM order_items oi
	   LEFT JOIN orders o ON o.id = oi.order_id
	  WHERE oi.order_id IS NOT NULL AND o.id IS NULL)         AS items_without_order,
	(SELECT COUNT(*) FROM price_offers po
	   LEFT JOIN orders o ON o.id = po.order_id
	  WHERE o.id IS NULL)                                     AS orphan_price_offers,
	(SELECT COUNT(*) FROM variant_prices vp
	   LEFT JOIN product_variants pv ON pv.id = vp.variant_id
	  WHERE pv.id IS NULL)                                    AS orphan_variant_prices;

-- ===========================================================================
-- Change this to COMMIT when the preview above looks right.
-- ===========================================================================
ROLLBACK;
