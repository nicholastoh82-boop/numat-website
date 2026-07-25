-- Rename product display name NuWeave -> NuWev (Brochure Rev 1 branding).
-- Slug (nuweave) and variant SKU (NUWEAVE-016-3PLY) are intentionally left
-- unchanged: the slug drives the /products/nuweave URL and the sample request
-- product key, and the SKU is snapshotted into quote_items, so renaming either
-- would orphan references or break the URL without a coordinated redirect.
-- Only the customer facing display name changes.
update products
set name = 'NuWev'
where slug = 'nuweave' and name = 'NuWeave';

-- The category previously named 'NuWeave' holds all three active boards
-- (NuWev, NuComposite, NuBam CLB), so it takes a neutral family name rather
-- than the NuWev product name.
update categories
set name = 'Engineered Bamboo Boards'
where name = 'NuWeave';
