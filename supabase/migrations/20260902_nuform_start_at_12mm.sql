-- NuForm now starts at 12 mm: remove the 8 mm and 10 mm variants and set the
-- product from price to PHP 1,600. Applied live via MCP; this records it.
DELETE FROM product_variants WHERE sku IN ('NUFORM-008', 'NUFORM-010');
UPDATE products SET base_price_php = 1600 WHERE slug = 'nuform';
