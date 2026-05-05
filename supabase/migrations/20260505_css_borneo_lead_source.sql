-- ============================================================================
-- CSS Borneo 2026 lead source values
-- ============================================================================
-- Adds the four expected source values for ICW Construction Sustainability
-- Summit Borneo 2026 to the master_leads source column.
--
-- Sources used:
--   css_borneo_2026_mohan          : main form, Mohan as host (speaker)
--   css_borneo_2026_nick           : main form, Nick as host
--   css_borneo_2026_mohan_quick    : quick capture prompt, Mohan
--   css_borneo_2026_nick_quick     : quick capture prompt, Nick
--
-- If master_leads.source is a free-text column, this migration is a no-op.
-- If master_leads.source is an enum, uncomment the ALTER TYPE statements.
-- ============================================================================

-- Helpful indexes for filtering CSS Borneo leads
create index if not exists master_leads_source_idx on master_leads (source);
create index if not exists master_leads_created_at_idx on master_leads (created_at desc);

-- If source is an enum, add the new values:
-- alter type lead_source add value if not exists 'css_borneo_2026_mohan';
-- alter type lead_source add value if not exists 'css_borneo_2026_nick';
-- alter type lead_source add value if not exists 'css_borneo_2026_mohan_quick';
-- alter type lead_source add value if not exists 'css_borneo_2026_nick_quick';
