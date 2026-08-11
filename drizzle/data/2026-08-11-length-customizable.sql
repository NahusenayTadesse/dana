-- Data change, not a schema migration: turn on cut-to-order lengths.
--
-- Until now every product had is_length_customizable = 0 with no
-- min/max/step, and no two variants shared a colour+width+thickness at
-- different lengths. That combination left the "add another length" (+)
-- button on /buy disabled on every row — there was no second length for it
-- to offer. See src/lib/components/buy-order-row.svelte (nextFreeLength).
--
-- Bounds are the price-safety net, not decoration: resolveOrderLines()
-- (src/lib/server/orderLines.ts) only honours a browser-supplied length for
-- a variant-backed line when the product is cut-to-order AND the value sits
-- inside [min_length, max_length]. The floor is what stops a "0.01m" order.
-- Each range below starts at or below the product's shortest catalog length
-- and ends at or above its longest, so nothing already orderable is
-- rejected.
--
-- Ridge Caps is deliberately left fixed: it is pressed to a standard length
-- and sold by the piece (9 of its 10 variants are 2m), so a free-dial length
-- would misrepresent what the factory actually makes.
--
-- Run against a database already at the latest schema:
--   mysql "$DATABASE_URL" < drizzle/data/2026-08-11-length-customizable.sql

UPDATE products
SET is_length_customizable = 1,
    min_length  = 1.00,
    max_length  = 12.00,
    max_length_unit = 'm',
    length_step = 0.50
WHERE name IN ('PPGI Colour-Coated Sheets', 'GI Galvanized Sheets');

UPDATE products
SET is_length_customizable = 1,
    min_length  = 1.00,
    max_length  = 6.00,
    max_length_unit = 'm',
    length_step = 0.50
WHERE name = 'Roofing Tile Profiles';

UPDATE products
SET is_length_customizable = 1,
    min_length  = 0.50,
    max_length  = 4.00,
    max_length_unit = 'm',
    length_step = 0.50
WHERE name = 'Flashings';

UPDATE products
SET is_length_customizable = 1,
    min_length  = 1.00,
    max_length  = 10.00,
    max_length_unit = 'm',
    length_step = 0.50
WHERE name = 'Gutters & Downpipes';

-- Ridge Caps: intentionally untouched (is_length_customizable stays 0).
