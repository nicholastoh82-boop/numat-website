-- Update variant prices to the ex factory figures from the Unit Economics file
-- (10 Aug 2026): NuBrid column L, NuWev column L, NuBam column Q. NuHybrid is
-- priced by ply, so each pair of thicknesses in a ply shares a price. Both the
-- displayed price (base_price_php) and ex_factory_php are set in sync.
UPDATE product_variants v
SET base_price_php = p.price, ex_factory_php = p.price
FROM (VALUES
  ('NUWEAVE-004-1PLY', 1000), ('NUWEAVE-008-2PLY', 2000), ('NUWEAVE-012-3PLY', 2500),
  ('NUWEAVE-016-4PLY', 3000), ('NUWEAVE-020-5PLY', 3500),
  ('NUHYB-008-2PLY', 4000), ('NUHYB-010-2PLY', 4000), ('NUHYB-012-3PLY', 5000),
  ('NUHYB-014-3PLY', 5000), ('NUHYB-016-4PLY', 5500), ('NUHYB-018-4PLY', 5500),
  ('NUHYB-020-5PLY', 6500), ('NUHYB-022-5PLY', 6500),
  ('NUBAMCLB-006-1PLY-H', 2500), ('NUBAMCLB-009-1PLY-H', 3500), ('NUBAMCLB-008-2PLY', 5000),
  ('NUBAMCLB-010-2PLY', 5500), ('NUBAMCLB-012-2PLY', 6000), ('NUBAMCLB-014-3PLY', 7000),
  ('NUBAMCLB-016-3PLY', 8500), ('NUBAMCLB-018-3PLY', 9500), ('NUBAMCLB-020-5PLY', 11000),
  ('NUBAMCLB-025-5PLY', 11500), ('NUBAMCLB-030-5PLY', 12000),
  ('NUBAMCLB-006-1PLY-V', 3500), ('NUBAMCLB-010-1PLY-V', 4500), ('NUBAMCLB-025-1PLY-V', 9000),
  ('NUBAMCLB-012-2PLY-HV', 5500), ('NUBAMCLB-016-2PLY-HV', 7000), ('NUBAMCLB-030-2PLY-HV', 11000),
  ('NUBAMCLB-020-3PLY-HV', 7500), ('NUBAMCLB-030-3PLY-HV', 9000), ('NUBAMCLB-040-3PLY-HV', 13000),
  ('NUBAMCLB-030-5PLY-HV', 12000), ('NUBAMCLB-040-5PLY-HV', 13500), ('NUBAMCLB-050-5PLY-HV', 17500)
) AS p(sku, price)
WHERE v.sku = p.sku;
