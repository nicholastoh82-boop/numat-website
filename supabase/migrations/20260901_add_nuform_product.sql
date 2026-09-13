-- New product: NuForm, an engineered bamboo concrete formwork panel. Six
-- thicknesses (8 to 18 mm) priced per the Aug 2026 NuForm price sheet, no ply
-- split, standard 4 by 8 ft panel, formwork photo. Same category as NuWev.
INSERT INTO products (name, description, unit, is_price_on_request, price_notes, is_active, slug, category_id, image_url, moq, moq_unit, is_featured, base_price_php)
VALUES ('NuForm', 'NuForm is an engineered bamboo concrete formwork panel, made for casting and forming concrete on site. A lower cost formwork board, offered in six thicknesses from 8 mm to 18 mm in the standard 4 by 8 ft (1220 x 2440 mm) panel size.', 'piece', false, 'excludes shipping', true, 'nuform', '9b05a17d-f47f-43da-aebb-a0f8e5bec0b1', '/nuweave/numat-engineered-bamboo-formwork-panels.jpg', 10, 'piece', true, 1600)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (product_id, thickness_mm, length_mm, width_mm, unit, moq, currency, is_price_on_request, price_notes, is_active, sku, size_label, ply_count, sort_order, in_stock, image_url, ex_factory_php, ex_factory_source, is_available, base_price_php)
SELECT (SELECT id FROM products WHERE slug='nuform'), t.th, 2440, 1220, 'piece', 10, 'PHP', false, 'excludes shipping', true, t.sku, t.lbl, NULL, t.so, true, '/nuweave/numat-engineered-bamboo-formwork-panels.jpg', t.price, 'NuForm price sheet Aug 2026', true, t.price
FROM (VALUES
  (12,'NUFORM-012','2440 mm x 1220 mm x 12 mm',30,1600),(14,'NUFORM-014','2440 mm x 1220 mm x 14 mm',40,1900),
  (16,'NUFORM-016','2440 mm x 1220 mm x 16 mm',50,2200),(18,'NUFORM-018','2440 mm x 1220 mm x 18 mm',60,2500)
) AS t(th,sku,lbl,so,price)
ON CONFLICT (sku) DO NOTHING;
