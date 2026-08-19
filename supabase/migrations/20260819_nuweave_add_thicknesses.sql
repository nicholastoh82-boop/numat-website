-- Add the three missing NuWeave thicknesses (10, 14, 18mm) as selectable
-- variants and fix the size_labels that used ranges now that each thickness is
-- distinct. The product page selector is variant driven, so these appear as
-- thickness buttons automatically.
INSERT INTO product_variants (product_id, thickness_mm, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, sku, size_label, ply_count, sort_order, in_stock, image_url, min_margin_pct, ex_factory_php, ex_factory_source, is_available, base_price_php)
SELECT product_id, 10, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, 'NUWEAVE-010-3PLY', '2440 mm x 1220 mm x 10 mm', 3, 25, in_stock, image_url, min_margin_pct, 2500, 'Aug 2026 price structure', is_available, 2500
FROM product_variants WHERE sku = 'NUWEAVE-012-3PLY';
INSERT INTO product_variants (product_id, thickness_mm, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, sku, size_label, ply_count, sort_order, in_stock, image_url, min_margin_pct, ex_factory_php, ex_factory_source, is_available, base_price_php)
SELECT product_id, 14, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, 'NUWEAVE-014-4PLY', '2440 mm x 1220 mm x 14 mm', 4, 35, in_stock, image_url, min_margin_pct, 3000, 'Aug 2026 price structure', is_available, 3000
FROM product_variants WHERE sku = 'NUWEAVE-012-3PLY';
INSERT INTO product_variants (product_id, thickness_mm, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, sku, size_label, ply_count, sort_order, in_stock, image_url, min_margin_pct, ex_factory_php, ex_factory_source, is_available, base_price_php)
SELECT product_id, 18, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, 'NUWEAVE-018-5PLY', '2440 mm x 1220 mm x 18 mm', 5, 45, in_stock, image_url, min_margin_pct, 3500, 'Aug 2026 price structure', is_available, 3500
FROM product_variants WHERE sku = 'NUWEAVE-012-3PLY';
UPDATE product_variants SET size_label = '2440 mm x 1220 mm x 12 mm' WHERE sku = 'NUWEAVE-012-3PLY';
UPDATE product_variants SET size_label = '2440 mm x 1220 mm x 16 mm' WHERE sku = 'NUWEAVE-016-4PLY';
UPDATE product_variants SET size_label = '2440 mm x 1220 mm x 20 mm' WHERE sku = 'NUWEAVE-020-5PLY';
