-- Seed data for Nubambu

-- Insert categories
INSERT INTO categories (name, slug, description, display_order) VALUES
  ('Furniture', 'furniture', 'Premium bamboo boards for furniture manufacturing', 1),
  ('Door', 'door', 'Pre-sized bamboo panels for door production', 2),
  ('Flooring', 'flooring', 'Click-lock and strand woven bamboo flooring', 3),
  ('Structural', 'structural', 'Heavy-duty bamboo for structural applications', 4),
  ('Wall Panelling', 'wall-panelling', 'Lightweight bamboo panels for interior walls', 5),
  ('Veneer', 'veneer', 'Flexible bamboo veneer sheets', 6),
  ('Cladding', 'cladding', 'Weather-resistant exterior bamboo cladding', 7),
  ('DIY Project', 'diy-project', 'Small format boards for DIY and crafts', 8)
ON CONFLICT (slug) DO NOTHING;

-- Insert products (based on Jan 07 2026 price table - SRP Ex Factory CDO)
INSERT INTO products (sku, title, size, thickness_mm, ply, price, moq, lead_time_days, category, description) VALUES
  -- Strand Woven Horizontal Grain (Furniture)
  ('SHG-6.35-1P', 'Strand Woven Bamboo Board - Natural', '2440 x 1220 mm', 6.35, '1-Ply', 1850, 10, 10, 'Furniture', 'Premium strand woven bamboo board perfect for furniture applications. Natural color with horizontal grain pattern.'),
  ('SHG-12.7-2P', 'Strand Woven Bamboo Board - Natural', '2440 x 1220 mm', 12.7, '2-Ply', 2450, 10, 10, 'Furniture', 'Double-ply strand woven bamboo board for enhanced durability. Ideal for tabletops and furniture panels.'),
  ('SHG-19-3P', 'Strand Woven Bamboo Board - Natural', '2440 x 1220 mm', 19, '3-Ply', 3200, 10, 10, 'Furniture', 'Heavy-duty triple-ply bamboo board for structural furniture and countertops.'),
  ('SHG-25-4P', 'Strand Woven Bamboo Board - Natural', '2440 x 1220 mm', 25, '4-Ply', 3950, 10, 10, 'Structural', 'Extra thick bamboo board for heavy-duty structural applications.'),
  
  -- Door panels
  ('DOOR-19-3P', 'Bamboo Door Panel - Carbonized', '2100 x 900 mm', 19, '3-Ply', 2800, 10, 10, 'Door', 'Pre-sized bamboo panel for door manufacturing. Carbonized finish for warm amber tone.'),
  ('DOOR-25-4P', 'Bamboo Door Panel - Carbonized', '2100 x 900 mm', 25, '4-Ply', 3400, 10, 10, 'Door', 'Premium thickness door panel with carbonized finish for solid core doors.'),
  
  -- Flooring
  ('FLR-14-CLICK', 'Bamboo Click Flooring - Natural', '1850 x 125 mm', 14, '3-Ply', 1450, 10, 10, 'Flooring', 'Easy-install click-lock bamboo flooring. Natural finish with UV coating.'),
  ('FLR-14-CARB', 'Bamboo Click Flooring - Carbonized', '1850 x 125 mm', 14, '3-Ply', 1550, 10, 10, 'Flooring', 'Carbonized bamboo flooring with rich amber tones. Click-lock installation.'),
  ('FLR-20-STRAND', 'Strand Woven Flooring - Tiger', '1850 x 125 mm', 20, 'Strand', 2100, 10, 10, 'Flooring', 'Ultra-durable strand woven flooring with distinctive tiger stripe pattern.'),
  
  -- Wall Panelling
  ('WALL-6-1P', 'Bamboo Wall Panel - Natural', '2440 x 600 mm', 6, '1-Ply', 950, 10, 10, 'Wall Panelling', 'Lightweight bamboo panels for interior wall cladding and feature walls.'),
  ('WALL-9-2P', 'Bamboo Wall Panel - Carbonized', '2440 x 600 mm', 9, '2-Ply', 1250, 10, 10, 'Wall Panelling', 'Carbonized wall panels with enhanced durability for commercial interiors.'),
  
  -- Veneer
  ('VNR-0.6-NAT', 'Bamboo Veneer Sheet - Natural', '2500 x 640 mm', 0.6, 'Veneer', 380, 10, 10, 'Veneer', 'Flexible bamboo veneer for furniture overlay and decorative applications.'),
  ('VNR-0.6-CARB', 'Bamboo Veneer Sheet - Carbonized', '2500 x 640 mm', 0.6, 'Veneer', 420, 10, 10, 'Veneer', 'Carbonized bamboo veneer with warm amber coloring.'),
  
  -- Cladding
  ('CLAD-12-EXT', 'Exterior Bamboo Cladding', '2440 x 150 mm', 12, '2-Ply', 1650, 10, 10, 'Cladding', 'Weather-resistant bamboo cladding for exterior facades. UV and moisture treated.'),
  ('CLAD-18-EXT', 'Heavy Duty Exterior Cladding', '2440 x 150 mm', 18, '3-Ply', 2200, 10, 10, 'Cladding', 'Premium exterior cladding for commercial buildings. Enhanced weather resistance.'),
  
  -- Structural
  ('STR-30-BEAM', 'Bamboo Structural Beam', '3000 x 150 x 150 mm', 30, '5-Ply', 4500, 10, 10, 'Structural', 'Load-bearing bamboo beam for structural applications. Engineered for strength.'),
  ('STR-40-POST', 'Bamboo Structural Post', '3000 x 200 x 200 mm', 40, '6-Ply', 5800, 10, 10, 'Structural', 'Heavy-duty structural post for columns and vertical supports.'),
  
  -- DIY Project
  ('DIY-6-CRAFT', 'Bamboo Craft Board', '600 x 400 mm', 6, '1-Ply', 280, 10, 10, 'DIY Project', 'Small format bamboo board for DIY projects and crafts.'),
  ('DIY-12-SHELF', 'Bamboo Shelf Board', '900 x 250 mm', 12, '2-Ply', 450, 10, 10, 'DIY Project', 'Pre-cut shelf board for home organization projects.'),
  ('DIY-19-DESK', 'Bamboo Desktop Panel', '1200 x 600 mm', 19, '3-Ply', 1200, 10, 10, 'DIY Project', 'Desktop panel for DIY desk builds and workstations.')
ON CONFLICT (sku) DO UPDATE SET
  title = EXCLUDED.title,
  size = EXCLUDED.size,
  thickness_mm = EXCLUDED.thickness_mm,
  ply = EXCLUDED.ply,
  price = EXCLUDED.price,
  moq = EXCLUDED.moq,
  lead_time_days = EXCLUDED.lead_time_days,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Insert default discount rules
INSERT INTO discount_rules (name, min_boards, discount_percent) VALUES
  ('Standard Volume Discount', 100, 15)
ON CONFLICT DO NOTHING;
