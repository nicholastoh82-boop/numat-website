-- Set the minimum order quantity to 50 for all active board products and their
-- variants (NuWeave, NuHybrid, NuBam CLB). The product page fallback, the
-- nubam-boards family rule and the default quantity are set to 50 in code to match.
update product_variants set moq = 50
where product_id in (select id from products where slug in ('nuhybrid','nuweave','nubam-clb'));

update products set moq = 50
where slug in ('nuhybrid','nuweave','nubam-clb');
