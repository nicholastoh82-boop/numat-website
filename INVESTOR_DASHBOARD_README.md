# Investor Dashboard

Live at `https://numatbamboo.com/investors`

## What it shows
Six chapter dashboard rendered from Supabase: snapshot, unit economics, margin structure, cash and runway, operations and pipeline, impact and risks. Distributed to Paul Lam and Marie at Wavemaker Impact.

## How it stays current
Two tables in Supabase project `peuwxnrojlfybdymkazj`:

- `financial_snapshots` updated monthly
- `impact_metrics` updated quarterly

The `/investors` page fetches the latest published row from each table on every request, with a 60 second ISR cache. As soon as a new row is published, the page reflects it.

## Monthly update workflow

1. Open Supabase Studio for project `peuwxnrojlfybdymkazj`
2. Open the `financial_snapshots` table
3. Duplicate the most recent row, then edit:
   - `period_label`, `period_start`, `period_end`
   - All financial numbers (cash, burn, revenue, opex, product mix, pipeline counts)
   - `ceo_commentary`, `watchlist_items`, `risk_register`, `scenarios` (JSONB)
   - Set `is_published = false` while drafting
4. When ready, set `is_published = true`. Older rows can stay published; the page picks the most recent one.

The trend chart and the path to breakeven recompute automatically from the data.

## Quarterly impact update
Same flow on `impact_metrics`. Update CO2, hectares, and headcount, then publish.

## Required env vars
Already in Vercel for the rest of the site:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Required dependency
Run once if not already installed:
```
npm install chart.js
```

## Files
- `app/investors/layout.tsx` — fonts, noindex meta
- `app/investors/page.tsx` — server component, Supabase fetch, derived metrics
- `app/investors/Dashboard.tsx` — client component, all rendering and charts
- `supabase/migrations/20260429_investor_dashboard.sql` — schema record (already applied to production via Supabase MCP on 29 Apr 2026)

## Sharing with Paul and Marie
The page has `noindex, nofollow` set so it will not appear in search results. Share via direct link only.
