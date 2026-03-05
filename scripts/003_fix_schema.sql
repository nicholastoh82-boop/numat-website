-- Fix schema issues

-- Drop problematic RLS policies that cause infinite recursion
DROP POLICY IF EXISTS "admin_profiles_super" ON admin_profiles;
DROP POLICY IF EXISTS "categories_admin_all" ON categories;
DROP POLICY IF EXISTS "products_admin_all" ON products;

-- Add category_id column to products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE products ADD COLUMN category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);

-- Recreate RLS policies without recursion
-- For admin_profiles, use a simpler check
CREATE POLICY "admin_profiles_read_own" ON admin_profiles 
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "admin_profiles_update_own" ON admin_profiles 
  FOR UPDATE USING (id = auth.uid());

-- For products and categories, allow public read and authenticated users with admin role can write
-- Use auth.jwt() to check role without querying admin_profiles
CREATE POLICY "products_admin_write" ON products 
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin' OR
     EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "categories_admin_write" ON categories 
  FOR ALL USING (
    auth.uid() IS NOT NULL AND 
    (auth.jwt() ->> 'role' = 'admin' OR auth.jwt() ->> 'role' = 'super_admin' OR
     EXISTS (SELECT 1 FROM admin_profiles WHERE id = auth.uid()))
  );

-- Update existing products to link to categories based on category text field
UPDATE products p
SET category_id = c.id
FROM categories c
WHERE LOWER(p.category) = LOWER(c.slug) OR LOWER(p.category) = LOWER(c.name);

-- Add 'name' column to products if it doesn't exist (API expects 'name' not 'title')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'name'
  ) THEN
    ALTER TABLE products ADD COLUMN name TEXT;
    UPDATE products SET name = title WHERE name IS NULL;
  END IF;
END $$;

-- Add 'slug' column to products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'slug'
  ) THEN
    ALTER TABLE products ADD COLUMN slug TEXT;
    UPDATE products SET slug = LOWER(REPLACE(REPLACE(title, ' ', '-'), '''', '')) WHERE slug IS NULL;
  END IF;
END $$;

-- Add 'base_price' column to products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'base_price'
  ) THEN
    ALTER TABLE products ADD COLUMN base_price DECIMAL(10,2);
    UPDATE products SET base_price = price WHERE base_price IS NULL;
  END IF;
END $$;

-- Add 'is_featured' column to products if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT false;
  END IF;
END $$;
