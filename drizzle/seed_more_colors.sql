-- Fills out the color axis for products that only had 1-2 colors on the
-- shelf, so the /buy page's color dropdown (buy-order-row.svelte) actually
-- has something to switch between. Adds the missing colors from the
-- `colors` table onto each product's existing canonical spec (the
-- width/thickness/length combo it already sells at), reusing that combo's
-- price/image — real per-color photography can replace image_url later.
--
-- GI Galvanized Sheets (product 3) is intentionally skipped: it's a bare
-- galvanized finish with no color variants by design (see
-- seed_production_demo.sql).
--
-- Safe to re-run: every inserted row uses a unique '-CLR' suffixed SKU that
-- doesn't collide with any pre-existing SKU, and inserts are guarded by
-- NOT EXISTS on the (product_id, color_id, width_id, thickness_id,
-- length_id) spec so re-running won't duplicate rows.

INSERT INTO product_variants (product_id, color_id, width_id, thickness_id, length_id, sku, price, quantity, reorder_level, image_url)
SELECT * FROM (
	-- PPGI Colour-Coated Sheets (product 2) — canonical spec: width 913mm,
	-- 0.425mm, 3.0m (id 1, PPGI-RED-STD). Already has color 1.
	SELECT 2, 2, 1, 2, 2, 'PPGI-BLU-CLR', 1250.00, 150, 20, 'b653b956-aaec-4339-ba7d-06a066adc4f1.jpg' UNION ALL
	SELECT 2, 3, 1, 2, 2, 'PPGI-GRN-CLR', 1250.00, 150, 20, 'b653b956-aaec-4339-ba7d-06a066adc4f1.jpg' UNION ALL
	SELECT 2, 4, 1, 2, 2, 'PPGI-GRY-CLR', 1250.00, 150, 20, 'b653b956-aaec-4339-ba7d-06a066adc4f1.jpg' UNION ALL
	SELECT 2, 5, 1, 2, 2, 'PPGI-WHT-CLR', 1250.00, 150, 20, 'b653b956-aaec-4339-ba7d-06a066adc4f1.jpg' UNION ALL
	SELECT 2, 6, 1, 2, 2, 'PPGI-BLK-CLR', 1250.00, 150, 20, 'b653b956-aaec-4339-ba7d-06a066adc4f1.jpg' UNION ALL
	SELECT 2, 7, 1, 2, 2, 'PPGI-OFW-CLR', 1250.00, 150, 20, 'b653b956-aaec-4339-ba7d-06a066adc4f1.jpg' UNION ALL
	SELECT 2, 8, 1, 2, 2, 'PPGI-BRN-CLR', 1250.00, 150, 20, 'b653b956-aaec-4339-ba7d-06a066adc4f1.jpg' UNION ALL

	-- Roofing Tile Profiles (product 4) — canonical spec: width 1219mm,
	-- 0.425mm, 2.0m (ids 11/12, TILE-RED-STD / TILE-GRN-STD). Has colors 1, 3.
	SELECT 4, 2, 3, 2, 1, 'TILE-BLU-CLR', 22.00, 900, 80, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png' UNION ALL
	SELECT 4, 4, 3, 2, 1, 'TILE-GRY-CLR', 22.00, 900, 80, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png' UNION ALL
	SELECT 4, 5, 3, 2, 1, 'TILE-WHT-CLR', 22.00, 900, 80, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png' UNION ALL
	SELECT 4, 6, 3, 2, 1, 'TILE-BLK-CLR', 22.00, 900, 80, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png' UNION ALL
	SELECT 4, 7, 3, 2, 1, 'TILE-OFW-CLR', 22.00, 900, 80, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png' UNION ALL
	SELECT 4, 8, 3, 2, 1, 'TILE-BRN-CLR', 22.00, 900, 80, '1c208df5-8612-442d-8b45-4c8cf37a4c1c.png' UNION ALL

	-- Ridge Caps (product 5) — canonical spec: width 48in, 0.40mm, 2.0m
	-- (ids 15/16, RIDGE-RED / RIDGE-BLU). Has colors 1, 2.
	SELECT 5, 3, 7, 1, 1, 'RIDGE-GRN-CLR', 15.00, 400, 40, '55a111db-d302-4298-882a-20a42edee50a.png' UNION ALL
	SELECT 5, 4, 7, 1, 1, 'RIDGE-GRY-CLR', 15.00, 400, 40, '55a111db-d302-4298-882a-20a42edee50a.png' UNION ALL
	SELECT 5, 5, 7, 1, 1, 'RIDGE-WHT-CLR', 15.00, 400, 40, '55a111db-d302-4298-882a-20a42edee50a.png' UNION ALL
	SELECT 5, 6, 7, 1, 1, 'RIDGE-BLK-CLR', 15.00, 400, 40, '55a111db-d302-4298-882a-20a42edee50a.png' UNION ALL
	SELECT 5, 7, 7, 1, 1, 'RIDGE-OFW-CLR', 15.00, 400, 40, '55a111db-d302-4298-882a-20a42edee50a.png' UNION ALL
	SELECT 5, 8, 7, 1, 1, 'RIDGE-BRN-CLR', 15.00, 400, 40, '55a111db-d302-4298-882a-20a42edee50a.png' UNION ALL

	-- Flashings (product 6) — canonical spec: width 36in, 0.40mm, 2.0m
	-- (ids 19/20, FLASH-GRY / FLASH-RED). Has colors 1, 4.
	SELECT 6, 2, 6, 1, 1, 'FLASH-BLU-CLR', 12.00, 350, 30, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg' UNION ALL
	SELECT 6, 3, 6, 1, 1, 'FLASH-GRN-CLR', 12.00, 350, 30, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg' UNION ALL
	SELECT 6, 5, 6, 1, 1, 'FLASH-WHT-CLR', 12.00, 350, 30, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg' UNION ALL
	SELECT 6, 6, 6, 1, 1, 'FLASH-BLK-CLR', 12.00, 350, 30, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg' UNION ALL
	SELECT 6, 7, 6, 1, 1, 'FLASH-OFW-CLR', 12.00, 350, 30, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg' UNION ALL
	SELECT 6, 8, 6, 1, 1, 'FLASH-BRN-CLR', 12.00, 350, 30, '6bf18dd6-d0c7-40dd-954d-65d2984bb2f7.jpg' UNION ALL

	-- Gutters & Downpipes (product 7) — canonical spec: width 60in, 0.70mm,
	-- 6.0m (id 22, GUT-GLV-HALF). Has color 7.
	SELECT 7, 1, 8, 4, 3, 'GUT-RED-CLR', 48.00, 400, 40, 'rollforming.jpg' UNION ALL
	SELECT 7, 2, 8, 4, 3, 'GUT-BLU-CLR', 48.00, 400, 40, 'rollforming.jpg' UNION ALL
	SELECT 7, 3, 8, 4, 3, 'GUT-GRN-CLR', 48.00, 400, 40, 'rollforming.jpg' UNION ALL
	SELECT 7, 4, 8, 4, 3, 'GUT-GRY-CLR', 48.00, 400, 40, 'rollforming.jpg' UNION ALL
	SELECT 7, 5, 8, 4, 3, 'GUT-WHT-CLR', 48.00, 400, 40, 'rollforming.jpg' UNION ALL
	SELECT 7, 6, 8, 4, 3, 'GUT-BLK-CLR', 48.00, 400, 40, 'rollforming.jpg' UNION ALL
	SELECT 7, 8, 8, 4, 3, 'GUT-BRN-CLR', 48.00, 400, 40, 'rollforming.jpg'
) AS new_rows(product_id, color_id, width_id, thickness_id, length_id, sku, price, quantity, reorder_level, image_url)
WHERE NOT EXISTS (
	SELECT 1 FROM product_variants pv
	WHERE pv.product_id = new_rows.product_id
	AND pv.color_id = new_rows.color_id
	AND pv.width_id = new_rows.width_id
	AND pv.thickness_id = new_rows.thickness_id
	AND pv.length_id = new_rows.length_id
);

-- Match variant_prices to the seed_production_demo.sql convention: one
-- 'quantity'-basis rate per variant, matching its retail price.
INSERT INTO variant_prices (variant_id, basis, price, price_includes_vat)
SELECT pv.id, 'quantity', pv.price, FALSE
FROM product_variants pv
WHERE pv.sku LIKE '%-CLR'
AND NOT EXISTS (SELECT 1 FROM variant_prices vp WHERE vp.variant_id = pv.id);
