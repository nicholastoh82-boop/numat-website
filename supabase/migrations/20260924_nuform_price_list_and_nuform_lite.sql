-- NuForm prices from the NuForm Price List effective 2 September 2026
-- (PHP, ex works Manolo Fortich, Bukidnon, per sheet 2440 x 1220 mm), plus the
-- NuForm Lite grade shown as price on request until its prices are confirmed.
--
-- Not applied automatically. Apply through the Supabase MCP or SQL editor after
-- the pull request merges. Existing NuForm variant rows are updated in place,
-- never deleted, so historic quote_items keep their variant_id.
--
-- product_variants has no unique constraint on sku, so rows are inserted only
-- when their sku is missing (safe to run twice) instead of ON CONFLICT.

BEGIN;

-- 1. Product level copy and "from" price
UPDATE products
SET description = 'NuForm is an engineered bamboo formwork board with a phenolic film on both faces, built for repeated concrete pours. Choose NuForm for the most reuse on demanding pours, or NuForm Lite for a lighter, lower cost board on standard work. Standard 4 by 8 ft (1220 x 2440 mm) sheet.',
    base_price_php = 1400
WHERE slug = 'nuform';

-- 2. Add the NuForm thicknesses that do not exist yet (4, 8, 10 and 20 mm)
INSERT INTO product_variants (product_id, thickness_mm, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, sku, size_label, sort_order, in_stock, image_url, is_available)
SELECT (SELECT id FROM products WHERE slug = 'nuform'), t.th, 2440, 1220, 'piece', 10, 'PHP', false, 'excludes shipping', true, t.sku, t.lbl, 0, true, '/products/nuform/nuform-board-stack.jpg', true
FROM (VALUES
  (4,  'NUFORM-004', '2440 mm x 1220 mm x 2 to 4 mm'),
  (8,  'NUFORM-008', '2440 mm x 1220 mm x 6 to 8 mm'),
  (10, 'NUFORM-010', '2440 mm x 1220 mm x 10 mm'),
  (20, 'NUFORM-020', '2440 mm x 1220 mm x 20 mm')
) AS t(th, sku, lbl)
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.sku = t.sku);

-- 3. Price, layer count and grade for every NuForm row, per the price list
UPDATE product_variants v
SET base_price_php = t.price,
    ex_factory_php = t.price,
    ex_factory_source = 'NuForm Price List 2 Sep 2026',
    size_label = t.lbl,
    ply_count = t.layers,
    grade = 'Standard',
    sort_order = t.so,
    is_price_on_request = false,
    is_active = true,
    is_available = true
FROM (VALUES
  ('NUFORM-004', '2440 mm x 1220 mm x 2 to 4 mm', 1, 1400, 10),
  ('NUFORM-008', '2440 mm x 1220 mm x 6 to 8 mm', 2, 2400, 20),
  ('NUFORM-010', '2440 mm x 1220 mm x 10 mm',     3, 2900, 30),
  ('NUFORM-012', '2440 mm x 1220 mm x 12 mm',     3, 3150, 40),
  ('NUFORM-014', '2440 mm x 1220 mm x 14 mm',     4, 3400, 50),
  ('NUFORM-016', '2440 mm x 1220 mm x 16 mm',     4, 3650, 60),
  ('NUFORM-018', '2440 mm x 1220 mm x 18 mm',     5, 3900, 70),
  ('NUFORM-020', '2440 mm x 1220 mm x 20 mm',     5, 4150, 80)
) AS t(sku, lbl, layers, price, so)
WHERE v.sku = t.sku;

-- 4. NuForm Lite: 8, 10 and 12 mm per the Master Sales Kit, price on request
INSERT INTO product_variants (product_id, thickness_mm, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, sku, size_label, sort_order, in_stock, image_url, is_available, base_price_php, grade)
SELECT (SELECT id FROM products WHERE slug = 'nuform'), t.th, 2440, 1220, 'piece', 10, 'PHP', true, 'price on request', true, t.sku, t.lbl, t.so, true, '/products/nuform/nuform-and-nuform-lite.jpg', true, NULL, 'Lite'
FROM (VALUES
  (8,  'NUFORM-LITE-008', '2440 mm x 1220 mm x 8 mm',  110),
  (10, 'NUFORM-LITE-010', '2440 mm x 1220 mm x 10 mm', 120),
  (12, 'NUFORM-LITE-012', '2440 mm x 1220 mm x 12 mm', 130)
) AS t(th, sku, lbl, so)
WHERE NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.sku = t.sku);

COMMIT;
