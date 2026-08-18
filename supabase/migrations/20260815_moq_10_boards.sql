-- Change the minimum order quantity from 50 to 10 for all offered products
-- (NuWeave, NuHybrid, NuBam CLB) and their variants. The product page fallback,
-- the nubam-boards family rule and the default quantity are set to 10 in code to match.
update product_variants set moq = 10
where product_id in (select id from products where slug in ('nuhybrid','nuweave','nubam-clb'));

update products set moq = 10
where slug in ('nuhybrid','nuweave','nubam-clb');
