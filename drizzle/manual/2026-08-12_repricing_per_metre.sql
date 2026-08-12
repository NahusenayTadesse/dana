-- ============================================================================
-- Repricing: Ega / Ridge cover / Gutter / Flashing onto per-metre rates
-- ============================================================================
--
-- Supplied rates (ETB per linear metre, VAT-EXCLUSIVE):
--
--   Ega            -> GI Galvanized Sheets   (id 3)   272.57 /m
--   R cover 50 dvL -> Ridge Caps             (id 5)    95.00 /m
--   gutter 60 dvL  -> Gutters & Downpipes    (id 7)   195.00 /m
--   flashing 33 dvL-> Flashings              (id 6)    71.60 /m
--
-- The Ega rate is derived from the two figures given: 817.7 / 3 m = 272.567 /m,
-- and 272.567 x 4 m = 1090.27, which matches the 1090 quoted. Stored to the
-- column's 2dp as 272.57.
--
-- The "50 / 60 / 33 dvL" figures are developed length in cm. The catalogue has
-- no developed-length dimension — those products are keyed on coil width (48in,
-- 60in, 36in) — so each rate is applied to every variant of its product.
--
-- PPGI Colour-Coated Sheets (id 2) and Roofing Tile Profiles (id 4) are
-- deliberately untouched and keep their existing per-piece prices.
--
-- ---------------------------------------------------------------------------
-- WHY TWO COLUMNS GET DIFFERENT NUMBERS
-- ---------------------------------------------------------------------------
-- `variant_prices` is the rate book the SERVER prices from (resolveOrderLines
-- -> pricing.ts), and it is basis-aware: a `length` rate is multiplied by the
-- line's length and quantity.
--
-- `product_variants.price` is what the STOREFRONT reads (loadBuyProductList),
-- and the client cart computes `price x quantity` with no length factor. Putting
-- a raw per-metre figure there would show a 3 m sheet at 272.57 instead of
-- 817.71 — every total on /buy and /checkout 2-10x too low.
--
-- So the rate book gets the true per-metre rate, and the storefront column gets
-- the per-sheet equivalent (rate x that variant's catalogue length). For every
-- catalogue length the two agree exactly.
--
-- KNOWN GAP: they diverge for a cut-to-order length, because the client keeps
-- the catalogue-length price while the server scales by the length actually
-- requested. The staff quote and all emails are correct either way — only the
-- on-screen estimate is low. The real fix is making the cart basis-aware
-- (cart.svelte.ts totals + buy-order-row lineTotal); see testErrors.md S9.
-- ============================================================================

START TRANSACTION;

-- 1. Clear the existing rate book for these four products only.
DELETE vp FROM `variant_prices` vp
JOIN `product_variants` v ON v.id = vp.variant_id
WHERE v.product_id IN (3, 5, 6, 7);

-- 2. Per-metre rates, VAT-exclusive.
INSERT INTO `variant_prices` (`variant_id`, `basis`, `price`, `price_includes_vat`)
SELECT v.id, 'length',
       CASE v.product_id
         WHEN 3 THEN 272.57   -- Ega / GI Galvanized Sheets
         WHEN 5 THEN  95.00   -- R cover / Ridge Caps
         WHEN 6 THEN  71.60   -- Flashing / Flashings
         WHEN 7 THEN 195.00   -- Gutter / Gutters & Downpipes
       END,
       0
FROM `product_variants` v
WHERE v.product_id IN (3, 5, 6, 7);

-- 3. Storefront price = rate x that variant's catalogue length.
UPDATE `product_variants` v
JOIN `lengths` l ON l.id = v.length_id
SET v.`price` = ROUND(l.value * CASE v.product_id
         WHEN 3 THEN 272.57
         WHEN 5 THEN  95.00
         WHEN 6 THEN  71.60
         WHEN 7 THEN 195.00
       END, 2)
WHERE v.product_id IN (3, 5, 6, 7);

COMMIT;

-- ---------------------------------------------------------------------------
-- Verify: rate book vs storefront, per variant length
-- ---------------------------------------------------------------------------
SELECT p.name                         AS product,
       l.value                        AS length_m,
       COUNT(*)                       AS variants,
       vp.price                       AS rate_per_m,
       v.price                        AS storefront_per_sheet,
       ROUND(vp.price * l.value, 2)   AS expected_per_sheet
FROM `product_variants` v
JOIN `products` p        ON p.id = v.product_id
JOIN `lengths` l         ON l.id = v.length_id
JOIN `variant_prices` vp ON vp.variant_id = v.id
WHERE v.product_id IN (3, 5, 6, 7)
GROUP BY p.name, l.value, vp.price, v.price
ORDER BY p.name, l.value;
