-- Final product naming decision: revert the woven board display name to NuWeave.
-- NuWeave is the pronounceable market name (matches live proposals and the
-- NUWEAVE SKU), superseding the interim NuWev spelling. Slug (nuweave) and SKU
-- (NUWEAVE-016-3PLY) already match, so nothing else moves.
update products
set name = 'NuWeave'
where slug = 'nuweave' and name = 'NuWev';
