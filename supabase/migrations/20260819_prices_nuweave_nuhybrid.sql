-- Update NuWeave and NuHybrid variant prices to the Aug 2026 price structures
-- (yellow ex-factory column). NuHybrid returns to a distinct price per thickness.
-- Both base_price_php and ex_factory_php set in sync.
UPDATE product_variants v
SET base_price_php = p.price, ex_factory_php = p.price
FROM (VALUES
  ('NUHYB-008-2PLY', 3500), ('NUHYB-010-2PLY', 4000), ('NUHYB-012-3PLY', 4500),
  ('NUHYB-014-3PLY', 5000), ('NUHYB-016-4PLY', 5500), ('NUHYB-018-4PLY', 6000),
  ('NUHYB-020-5PLY', 6500), ('NUHYB-022-5PLY', 7000),
  ('NUWEAVE-004-1PLY', 1000), ('NUWEAVE-008-2PLY', 2000), ('NUWEAVE-012-3PLY', 2750),
  ('NUWEAVE-016-4PLY', 3250), ('NUWEAVE-020-5PLY', 3750)
) AS p(sku, price)
WHERE v.sku = p.sku;
