-- ============================================================================
-- Migration: master_leads pool extension (universal lead pool fields)
-- Project:   peuwxnrojlfybdymkazj
-- Date:      2026-05-02
-- Purpose:   Extend master_leads so it serves as the universal lead pool for
--            all of Nick's businesses (NUMAT today, Kastelon and others
--            later). Adds intended_business, enrichment_tier, last_enriched_at,
--            source_payload, and a generated dedup_key column with index.
-- Safety:    All new columns are nullable or have defaults. No existing data
--            is modified beyond the auto-populated dedup_key (computed from
--            email or company + name). The dedup_key index is non-unique to
--            tolerate any pre-existing duplicates from earlier sources; the
--            application layer enforces dedup via SELECT-then-INSERT.
-- Rollback:  See the rollback block at the bottom of this file.
-- ============================================================================

BEGIN;

-- 1. Universal pool fields ---------------------------------------------------

-- Which business(es) this lead is intended for. Default 'pool' = available to
-- any business; specific values like 'numat', 'kastelon', or csv combos are
-- set when a lead is claimed for a campaign.
ALTER TABLE master_leads
  ADD COLUMN IF NOT EXISTS intended_business text DEFAULT 'pool';

-- Stage in the enrichment pipeline. Drives the enrichment cron's batch picks.
--   raw       = name + company only
--   basic     = + email (Apollo verified)
--   enriched  = + company research (Sonnet)
--   validated = + ZeroBounce verdict
ALTER TABLE master_leads
  ADD COLUMN IF NOT EXISTS enrichment_tier text DEFAULT 'raw';

-- Last time any enrichment ran on this row (Apollo, Sonnet, ZeroBounce, etc.)
ALTER TABLE master_leads
  ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz;

-- Raw payload from whichever scraper / source inserted the row. Used for
-- audit trail and for re-running normalization later. Never displayed to
-- end users.
ALTER TABLE master_leads
  ADD COLUMN IF NOT EXISTS source_payload jsonb;

-- 2. Generated dedup_key column ----------------------------------------------
-- Computed once on insert and re-computed on update of source columns.
-- Lowercased email when present, otherwise a composite of company + name or
-- company + linkedin. Used by all scrapers as the cross-source dedup key.
ALTER TABLE master_leads
  ADD COLUMN IF NOT EXISTS dedup_key text
  GENERATED ALWAYS AS (
    CASE
      WHEN email IS NOT NULL AND length(trim(email)) > 0
        THEN lower(trim(email))
      WHEN company IS NOT NULL AND full_name IS NOT NULL
        THEN lower(trim(company)) || '|' || lower(trim(full_name))
      WHEN company IS NOT NULL AND linkedin_url IS NOT NULL
        THEN lower(trim(company)) || '|' || lower(trim(linkedin_url))
      ELSE NULL
    END
  ) STORED;

-- 3. CHECK constraint on enrichment_tier (idempotent) ------------------------
ALTER TABLE master_leads
  DROP CONSTRAINT IF EXISTS master_leads_enrichment_tier_check;
ALTER TABLE master_leads
  ADD CONSTRAINT master_leads_enrichment_tier_check
  CHECK (
    enrichment_tier IS NULL
    OR enrichment_tier IN ('raw', 'basic', 'enriched', 'validated')
  );

-- 4. Indexes ----------------------------------------------------------------
-- intended_business: drives "find pool leads" queries
CREATE INDEX IF NOT EXISTS idx_master_leads_intended_business
  ON master_leads (intended_business);

-- enrichment_tier: drives "find leads needing enrichment" queries
CREATE INDEX IF NOT EXISTS idx_master_leads_enrichment_tier
  ON master_leads (enrichment_tier)
  WHERE enrichment_tier IS NOT NULL;

-- last_enriched_at: drives re-enrichment scheduling (oldest first)
CREATE INDEX IF NOT EXISTS idx_master_leads_last_enriched_at
  ON master_leads (last_enriched_at NULLS FIRST);

-- dedup_key: fast lookup before insert. Non-unique because the table
-- already has 8,860+ rows that may contain duplicates from earlier
-- sources. The application layer enforces dedup via SELECT-then-INSERT.
CREATE INDEX IF NOT EXISTS idx_master_leads_dedup_key
  ON master_leads (dedup_key)
  WHERE dedup_key IS NOT NULL;

COMMIT;

-- ============================================================================
-- Verification (run after deploy)
-- ============================================================================

-- Confirm new columns exist:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'master_leads'
--   AND column_name IN (
--     'intended_business', 'enrichment_tier', 'last_enriched_at',
--     'dedup_key', 'source_payload'
--   );

-- Confirm dedup_key populated for existing rows:
-- SELECT count(*) AS total,
--        count(dedup_key) AS with_dedup_key,
--        count(*) - count(dedup_key) AS without_dedup_key
-- FROM master_leads;

-- Sample dedup_key values:
-- SELECT id, email, company, full_name, dedup_key
-- FROM master_leads
-- ORDER BY created_at DESC
-- LIMIT 10;

-- Distribution of intended_business after backfill:
-- SELECT intended_business, count(*)
-- FROM master_leads
-- GROUP BY 1;

-- Estimate of duplicates by dedup_key (informational only):
-- SELECT count(*) AS duplicate_groups,
--        sum(c) - count(*) AS extra_rows_to_clean
-- FROM (
--   SELECT dedup_key, count(*) AS c
--   FROM master_leads
--   WHERE dedup_key IS NOT NULL
--   GROUP BY dedup_key
--   HAVING count(*) > 1
-- ) sub;

-- ============================================================================
-- Rollback (run only if you need to revert)
-- ============================================================================

-- BEGIN;
-- DROP INDEX IF EXISTS idx_master_leads_dedup_key;
-- DROP INDEX IF EXISTS idx_master_leads_last_enriched_at;
-- DROP INDEX IF EXISTS idx_master_leads_enrichment_tier;
-- DROP INDEX IF EXISTS idx_master_leads_intended_business;
-- ALTER TABLE master_leads DROP CONSTRAINT IF EXISTS master_leads_enrichment_tier_check;
-- ALTER TABLE master_leads DROP COLUMN IF EXISTS dedup_key;
-- ALTER TABLE master_leads DROP COLUMN IF EXISTS source_payload;
-- ALTER TABLE master_leads DROP COLUMN IF EXISTS last_enriched_at;
-- ALTER TABLE master_leads DROP COLUMN IF EXISTS enrichment_tier;
-- ALTER TABLE master_leads DROP COLUMN IF EXISTS intended_business;
-- COMMIT;
