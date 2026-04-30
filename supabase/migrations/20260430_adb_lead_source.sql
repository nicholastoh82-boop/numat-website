-- ============================================================================
-- Migration: ADB 2026 Samarkand lead source
-- Project: peuwxnrojlfybdymkazj
-- Date:    2026-04-30
-- Purpose: Allow the /samarkand landing page to capture leads into master_leads
--          with source = 'adb_2026_samarkand'.
-- ============================================================================

BEGIN;

-- 1. Add the new source value if source is enum constrained.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type t
    WHERE t.typname = 'master_leads_source_enum'
  ) THEN
    BEGIN
      ALTER TYPE master_leads_source_enum ADD VALUE IF NOT EXISTS 'adb_2026_samarkand';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'enum may already include the value, continuing';
    END;
  END IF;
END $$;

-- If your source column has a CHECK constraint, run the following manually
-- after inspecting the existing constraint name:
--
-- ALTER TABLE master_leads DROP CONSTRAINT master_leads_source_check;
-- ALTER TABLE master_leads ADD CONSTRAINT master_leads_source_check
--   CHECK (source IN (
--     'apollo_outbound', 'archi_malaysia', 'website_form', 'referral',
--     'adb_2026_samarkand'
--   ));

-- 2. Indexes for the dashboard
CREATE INDEX IF NOT EXISTS idx_master_leads_source
  ON master_leads (source);

CREATE INDEX IF NOT EXISTS idx_master_leads_created_at
  ON master_leads (created_at DESC);

COMMIT;

-- ============================================================================
-- Verification (run after deploy)
-- ============================================================================

-- SELECT count(*) FROM master_leads WHERE source = 'adb_2026_samarkand';

-- SELECT created_at, full_name, company, email, phone
-- FROM master_leads
-- WHERE source = 'adb_2026_samarkand'
-- ORDER BY created_at DESC
-- LIMIT 50;
