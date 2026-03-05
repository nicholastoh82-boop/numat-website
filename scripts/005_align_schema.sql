-- Align the products table schema to match the actual database structure
-- The database uses: sku, title, size, thickness_mm, ply, price, moq, lead_time_days, category, image

-- Verify the current schema is correct and products are properly inserted
-- Products table already has the correct schema from 001_create_tables.sql

-- No migration needed - the products table already matches the schema
-- Confirm the data is in place
SELECT COUNT(*) as product_count FROM products;
SELECT DISTINCT category FROM products;
