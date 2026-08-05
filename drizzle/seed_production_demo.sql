-- Production demo seed for Dana Steel Factory.
-- Replaces variant/color/pricing/image data with real photos already living
-- in files/ (uploaded product renders + factory shots), keeping the existing
-- product rows (id/name/slug/category) untouched aside from featured_image.
-- Safe to re-run: wipes and rebuilds the tables below only.

SET FOREIGN_KEY_CHECKS = 0;

-- Any existing order_items pointing at a variant we're about to delete would
-- otherwise be left silently repointed at whatever new variant happens to
-- land on that same recycled id — pin them back by SKU-equivalent (red
-- PPGI, variant 1 below) after the rebuild instead.
DELETE FROM variant_prices;
DELETE FROM product_variants;
DELETE FROM product_images;
DELETE FROM colors WHERE id = 9; -- drop the leftover "Test" color
UPDATE colors SET swatch_image = NULL WHERE swatch_image LIKE 'swatches/%'; -- dead paths; storefront uses hex_value

-- ---------------------------------------------------------------------
-- Product variants (real spec combos against the existing widths/
-- thicknesses/lengths/colors reference tables)
-- ---------------------------------------------------------------------

INSERT INTO product_variants (id, product_id, color_id, width_id, thickness_id, length_id, sku, price, quantity, reorder_level, image_url) VALUES
-- PPGI Colour-Coated Sheets (product 2)
(1, 2, 1, 1, 2, 2, 'PPGI-RED-STD',   1250.00, 150, 20, 'sheet-red.jpg'),
(2, 2, 2, 2, 3, 3, 'PPGI-BLU-STD',   1420.00,  90, 15, '00b94b1d-fd70-4075-8135-3867c3be1eff.png'),
(3, 2, 3, 1, 1, 1, 'PPGI-GRN-STD',   1180.00, 200, 25, '633eb3f3-2932-4b48-9677-730fa126df48.jpg'),
(4, 2, 6, 4, 4, 4, 'PPGI-BLK-ARCH',  1690.00,  60, 10, '8a1db32d-a737-42dd-8717-47cc2c90d328.png'),
(5, 2, 3, 2, 2, 5, 'PPGI-GRN-NOVELTY-CUSTOM', 1550.00, 0, 5, 'ppgi-grass.jpg'),
(6, 2, 1, 3, 3, 2, 'PPGI-RED-COIL',  1310.00,  75, 10, 'c50d9af1-1b18-4f41-879a-bd3bb8e11067.png'),

-- GI Galvanized Sheets (product 3) — bare finish, no color
(7,  3, NULL, 1, 3, 1, 'GI-BARE-STD',   980.00, 300, 30, '74d16e8d-538c-4b9d-b168-823023957527.png'),
(8,  3, NULL, 2, 5, 2, 'GI-BARE-MED',  1180.00, 180, 20, 'forklift.jpg'),
(9,  3, NULL, 3, 6, 3, 'GI-BARE-HVY',  1450.00,  90, 10, 'be7e9437-a008-482f-bf28-1115e184f288.png'),
(10, 3, NULL, 5, 8, 4, 'GI-BARE-PLATE',1980.00,  40,  5, '74d16e8d-538c-4b9d-b168-823023957527.png'),

-- Roofing Tile Profiles (product 4)
(11, 4, 1, 3, 2, 1, 'TILE-RED-STD',  22.00, 1200, 100, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png'),
(12, 4, 3, 3, 2, 1, 'TILE-GRN-STD',  22.00,  950,  80, '3be040a5-d481-42d6-8627-056f0593274b.png'),
(13, 4, 6, 4, 3, 2, 'TILE-BLK-HVY',  26.50,  640,  60, '4540190a-80d1-4829-8f6c-50299eb8bdbd.png'),
(14, 4, 8, 4, 3, 2, 'TILE-BRN-HVY',  26.50,  400,  40, 'a6ae8abc-fd8c-41de-9e06-4c1dc45d3fe9.jpg'),

-- Ridge Caps (product 5)
(15, 5, 1, 7, 1, 1, 'RIDGE-RED', 15.00, 450, 40, '55a111db-d302-4298-882a-20a42edee50a.png'),
(16, 5, 2, 7, 1, 1, 'RIDGE-BLU', 15.00, 380, 40, 'db30b593-2f7b-4c19-b82b-8d15c605a923.png'),
(17, 5, 6, 7, 2, 1, 'RIDGE-BLK', 17.50, 220, 25, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg'),
(18, 5, NULL, 8, 3, 2, 'RIDGE-GI', 19.00, 150, 20, 'a6ae8abc-fd8c-41de-9e06-4c1dc45d3fe9.jpg'),

-- Flashings (product 6)
(19, 6, 4, 6, 1, 1, 'FLASH-GRY', 12.00, 500, 50, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg'),
(20, 6, 1, 6, 1, 1, 'FLASH-RED', 12.00, 300, 30, 'db30b593-2f7b-4c19-b82b-8d15c605a923.png'),
(21, 6, 2, 7, 2, 2, 'FLASH-BLU', 14.50, 260, 25, 'a6ae8abc-fd8c-41de-9e06-4c1dc45d3fe9.jpg'),

-- Gutters & Downpipes (product 7)
(22, 7, 7, 8, 4, 3, 'GUT-GLV-HALF', 48.00, 500, 40, 'rollforming.jpg'),
(23, 7, 4, 8, 5, 3, 'GUT-GRY-BOX',  56.00, 310, 30, 'slitting-line.jpg'),
(24, 7, NULL, 7, 6, 4, 'GUT-GI-DOWNPIPE', 62.00, 600, 50, 'warehouse.jpg');

-- ---------------------------------------------------------------------
-- Variant price book — all current products sell by 'quantity' (per
-- products.sold_by), so every variant gets a single quantity-basis rate
-- matching its retail price.
-- ---------------------------------------------------------------------

INSERT INTO variant_prices (variant_id, basis, price, price_includes_vat)
SELECT id, 'quantity', price, FALSE FROM product_variants WHERE id BETWEEN 1 AND 24;

-- ---------------------------------------------------------------------
-- Product gallery images (real shots, replacing the old placeholder rows)
-- ---------------------------------------------------------------------

INSERT INTO product_images (product_id, image_url) VALUES
(2, '00b94b1d-fd70-4075-8135-3867c3be1eff.png'),
(2, '633eb3f3-2932-4b48-9677-730fa126df48.jpg'),
(2, 'ppgi-grass.jpg'),
(3, 'forklift.jpg'),
(3, 'be7e9437-a008-482f-bf28-1115e184f288.png'),
(4, '4540190a-80d1-4829-8f6c-50299eb8bdbd.png'),
(4, 'a6ae8abc-fd8c-41de-9e06-4c1dc45d3fe9.jpg'),
(4, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png'),
(5, 'db30b593-2f7b-4c19-b82b-8d15c605a923.png'),
(5, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg'),
(6, 'db30b593-2f7b-4c19-b82b-8d15c605a923.png'),
(6, 'a6ae8abc-fd8c-41de-9e06-4c1dc45d3fe9.jpg'),
(7, 'rollforming.jpg'),
(7, 'slitting-line.jpg'),
(7, 'warehouse.jpg');

-- ---------------------------------------------------------------------
-- Featured image per product — keeps the existing product identity
-- (id/name/slug/category), only swaps the thumbnail to a real render.
-- ---------------------------------------------------------------------

UPDATE products SET featured_image = 'sheet-red.jpg' WHERE id = 2;
UPDATE products SET featured_image = '74d16e8d-538c-4b9d-b168-823023957527.png' WHERE id = 3;
UPDATE products SET featured_image = '3be040a5-d481-42d6-8627-056f0593274b.png' WHERE id = 4;
UPDATE products SET featured_image = '55a111db-d302-4298-882a-20a42edee50a.png' WHERE id = 5;
UPDATE products SET featured_image = '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg' WHERE id = 6;
UPDATE products SET featured_image = 'rollforming.jpg' WHERE id = 7;

-- Re-point any pre-existing order_items that referenced a now-recycled
-- variant id back to an equivalent real variant (best-effort by product +
-- prior color intent — currently only order_item 4 / order 2, red PPGI).
UPDATE order_items SET variant_id = 1 WHERE id = 4 AND product_id = 2;

SET FOREIGN_KEY_CHECKS = 1;
