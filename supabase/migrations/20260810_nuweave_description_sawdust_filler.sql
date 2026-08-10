-- Correct the NuWeave product description.
-- NuWeave has no bamboo sawdust core. It is built around a woven bamboo mat,
-- with bamboo sawdust used only as a filler in the crevices of the weave,
-- the same construction model as NuHybrid. Wording mirrors the NuHybrid
-- description so the two products read consistently.

update products
set description = 'Laminated woven bamboo panels built around a woven bamboo mat, with bamboo sawdust filling the crevices of the weave to make the panel sturdier, bonded with phenolic resin and faced with phenolic film on both sides. Applications include concrete formwork panels, cladding, decking, and decorative, acoustic and industrial panels.'
where slug = 'nuweave';
