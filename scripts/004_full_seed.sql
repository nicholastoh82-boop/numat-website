-- Full seed script for Nubambu products with proper foreign keys
-- This script properly links products to categories and populates real product data

-- Clear existing products to start fresh
DELETE FROM quote_items;
DELETE FROM quotes;
DELETE FROM products;

-- Insert 30+ products with realistic bamboo product data
-- Furniture category products
INSERT INTO products (sku, title, size, thickness_mm, ply, price, moq, lead_time_days, category, description, is_active) VALUES
  ('NBF-20-NAT', 'Natural Bamboo Furniture Board 20mm', '1220x2440mm', 20, 'Solid', 2850, 5, 14, 'Furniture', 'Premium solid bamboo board for furniture making. Natural color with exceptional grain patterns.', true),
  ('NBF-20-CAR', 'Caramelized Furniture Board 20mm', '1220x2440mm', 20, 'Solid', 3150, 5, 14, 'Furniture', 'Heat-treated bamboo board with rich caramel tones. Perfect for modern furniture.', true),
  ('NBF-25-TIG', 'Tiger Stripe Furniture Board 25mm', '1220x2440mm', 25, 'Solid', 3650, 3, 21, 'Furniture', 'Distinctive tiger stripe pattern bamboo board for statement furniture pieces.', true),
  ('NBF-18-CRB', 'Carbonized Furniture Board 18mm', '1220x2440mm', 18, 'Solid', 2650, 5, 14, 'Furniture', 'Dark carbonized bamboo board with uniform color. Ideal for contemporary designs.', true),
  ('NBF-30-NED', 'Natural Edge Furniture Board 30mm', '300-400x2000mm', 30, 'Solid', 4200, 2, 21, 'Furniture', 'Thick bamboo board with natural edge for live-edge furniture.', true),

-- Flooring category products
  ('SWF-14-NAT', 'Strand Woven Flooring Natural 14mm', '138x1850mm', 14, '3-ply', 185, 20, 21, 'Flooring', 'High-density strand woven bamboo flooring. Extremely durable with Janka hardness 3000+.', true),
  ('SWF-14-CAR', 'Strand Woven Flooring Caramel 14mm', '138x1850mm', 14, '3-ply', 195, 20, 21, 'Flooring', 'Premium strand woven flooring in warm caramel tones. Click-lock installation.', true),
  ('CLF-12-NAT', 'Click-Lock Bamboo Flooring 12mm', '125x1200mm', 12, '2-ply', 145, 25, 14, 'Flooring', 'Easy-install click-lock bamboo flooring for residential applications.', true),
  ('EBF-15-TIG', 'Engineered Bamboo Flooring 15mm', '190x1900mm', 15, '2-ply', 220, 15, 21, 'Flooring', 'Engineered bamboo with HDF core. Tiger stripe pattern for unique aesthetics.', true),
  ('SBP-10-MIX', 'Solid Bamboo Parquet 10mm', '90x450mm', 10, 'Solid', 165, 30, 21, 'Flooring', 'Traditional parquet bamboo flooring in mixed natural tones.', true),

-- Door category products
  ('IDP-40-NAT', 'Interior Door Panel Natural 40mm', '900x2100mm', 40, 'Solid', 8500, 2, 28, 'Door', 'Solid bamboo door panel for interior applications. Pre-finished for easy installation.', true),
  ('IDP-40-CAR', 'Interior Door Panel Caramel 40mm', '900x2100mm', 40, 'Solid', 9200, 2, 28, 'Door', 'Caramelized bamboo door panel with enhanced durability.', true),
  ('EDB-45-CRB', 'Exterior Door Blank 45mm', '1000x2200mm', 45, 'Solid', 12500, 1, 35, 'Door', 'Heavy-duty carbonized bamboo blank for exterior doors. Weather-resistant finish.', true),
  ('SDP-35-NAT', 'Sliding Door Panel 35mm', '1200x2400mm', 35, 'Solid', 7800, 2, 28, 'Door', 'Lightweight bamboo panel for sliding door systems.', true),

-- Structural category products
  ('BBM-150-NAT', 'Bamboo Beam 150x150 6m', '150x150x6000mm', 150, 'Laminated', 4500, 4, 35, 'Structural', 'Laminated bamboo beam for structural applications. Load-bearing certified.', true),
  ('BCL-200-NAT', 'Bamboo Column 200x200 4m', '200x200x4000mm', 200, 'Laminated', 6200, 2, 35, 'Structural', 'Heavy-duty laminated bamboo column for construction.', true),
  ('BIB-300-NAT', 'Bamboo I-Beam 8m', '300x100x8000mm', 300, 'Laminated', 8500, 2, 42, 'Structural', 'Engineered bamboo I-beam for long-span applications.', true),
  ('BDJ-75-NAT', 'Bamboo Decking Joist 75x50 4m', '75x50x4000mm', 75, 'Solid', 850, 10, 21, 'Structural', 'Treated bamboo joists for outdoor decking structures.', true),

-- Wall Panelling category products
  ('AWP-25-NAT', 'Acoustic Wall Panel 25mm', '600x2400mm', 25, '3D', 3200, 5, 21, 'Wall Panelling', 'Perforated bamboo acoustic panel for sound absorption. NRC 0.85.', true),
  ('SWP-20-MIX', 'Slat Wall Panel 20mm', '300x2700mm', 20, 'Slats', 2800, 8, 21, 'Wall Panelling', 'Modern slat wall panel with mixed natural and caramel tones.', true),
  ('WPW-30-NAT', '3D Wall Panel Wave 30mm', '500x500mm', 30, '3D', 450, 20, 14, 'Wall Panelling', '3D wave pattern bamboo wall panel for feature walls.', true),
  ('WWP-15-CAR', 'Woven Wall Panel 15mm', '1000x2000mm', 15, 'Woven', 1850, 10, 21, 'Wall Panelling', 'Traditional woven bamboo panel for decorative applications.', true),

-- Veneer category products
  ('BVS-0.6-NAT', 'Bamboo Veneer Sheet Natural 0.6mm', '1250x2500mm', 0.6, 'Veneer', 65, 50, 7, 'Veneer', 'Paper-thin bamboo veneer for lamination and overlay. Flexible and easy to apply.', true),
  ('BVS-0.6-CAR', 'Bamboo Veneer Sheet Caramel 0.6mm', '1250x2500mm', 0.6, 'Veneer', 75, 50, 7, 'Veneer', 'Caramelized bamboo veneer with consistent color.', true),
  ('EBR-0.5-NAT', 'Edge Banding Roll Natural 0.5mm', '22x50m', 0.5, 'Tape', 45, 20, 7, 'Veneer', 'Bamboo edge banding for finishing exposed edges. Pre-glued backing.', true),
  ('FBV-0.8-TIG', 'Fleece-Backed Veneer 0.8mm', '600x2500mm', 0.8, 'Veneer', 120, 25, 10, 'Veneer', 'Fleece-backed bamboo veneer for curved applications.', true),

-- Cladding category products
  ('ECB-20-NAT', 'Exterior Cladding Board 20mm', '140x2400mm', 20, 'Solid', 185, 50, 28, 'Cladding', 'Weather-resistant bamboo cladding for exterior facades. 25-year warranty.', true),
  ('ECB-20-CRB', 'Exterior Cladding Carbonized 20mm', '140x2400mm', 20, 'Solid', 195, 50, 28, 'Cladding', 'Carbonized exterior cladding with enhanced weather resistance.', true),
  ('DKB-25-NAT', 'Decking Board Anti-Slip 25mm', '140x2400mm', 25, 'Solid', 165, 30, 21, 'Cladding', 'Anti-slip bamboo decking board for outdoor spaces.', true),
  ('SFP-12-NAT', 'Soffit Panel Ventilated 12mm', '200x4000mm', 12, 'Perforated', 145, 25, 21, 'Cladding', 'Ventilated bamboo soffit panel for roof overhangs.', true),

-- DIY Project category products
  ('CBS-10-NAT', 'Craft Board Small 10mm', '300x600mm', 10, 'Solid', 180, 10, 7, 'DIY Project', 'Small bamboo craft board for hobbyists and makers.', true),
  ('CBM-15-NAT', 'Craft Board Medium 15mm', '400x800mm', 15, 'Solid', 320, 5, 7, 'DIY Project', 'Medium bamboo board for DIY furniture projects.', true),
  ('BSP-5-MIX', 'Bamboo Strip Pack Assorted 5mm', 'Various', 5, 'Solid', 95, 20, 7, 'DIY Project', 'Assorted bamboo strips for craft projects. Mixed sizes and colors.', true),
  ('BDS-VAR-NAT', 'Bamboo Dowel Set Various', '1000mm', 10, 'Solid', 65, 25, 7, 'DIY Project', 'Set of bamboo dowels in various diameters. Perfect for joinery.', true),
  ('CUB-25-NAT', 'Cutting Board Blank 25mm', '350x500mm', 25, 'End-Grain', 450, 5, 10, 'DIY Project', 'End-grain bamboo blank for cutting board making.', true);
