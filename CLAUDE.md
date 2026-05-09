# NUMAT Sustainable Manufacturing — numatbamboo.com

This repo is the production site, in house CRM, CEO dashboard, and lead capture surface for NUMAT. It also hosts the NARA AI chat widget, automated SEO article pipeline, and financial operations system (receipt upload + Claude Vision extraction + admin dashboard).

> Inherits global rules from `C:\Users\nicho\.claude\CLAUDE.md`. The notes below extend, not replace, those rules.

## Stack
- Next.js (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (Postgres, Auth, Edge Functions), project ID `peuwxnrojlfybdymkazj`
- Vercel hosting
- Anthropic Claude via Cloudflare AI Gateway (never direct to api.anthropic.com)
- n8n for outreach orchestration (being progressively replaced by Next.js API routes for new flows; existing n8n workflows remain in place)

## Critical product names (use these exactly)
NuBam Boards, NuWall, NuDoor, NuFloor, NuSlat.

Never write BambooMDF, BambooPlywood, or "Bamboo Decking". Past content may contain the wrong names; correct on sight.

## Cold outreach copy rules (hard constraints)
- Never claim certifications, LEED credits, fire ratings, acoustic ratings, ASTM ratings, or Class A ratings. NUMAT does not currently hold these.
- No shortforms or jargon. Expand all acronyms on first use.
- Signoffs by sender:
  - Nick: "Business Administrator"
  - Bryan Suarin: "Chief Operating Officer"
  - Mohan Louis: "Head of Growth"
- Any change to outbound email content (subject, body, signature, CTA) requires Nick's review and approval before being applied. Surface the diff first.

## Lead routing
- Philippines leads: bryan@numat.ph, cal.com/bryan-suarin-rxvhte/discovery
- International leads: mohan@numat.ph, cal.com/mohanlouis/discovery
- Nick: cal.com/numatnicholas/discovery
- Lemuel and Arlene resigned April 2026. Do not reference, do not auto assign to either.

## Lead consolidation
All leads from any source (Apollo, scrapers, web forms, manual entry, ARCHI dataset, partner referrals) insert directly into the `master_leads` table on Supabase project `peuwxnrojlfybdymkazj`. Use `source` and `segment` fields to differentiate. Do not create new separate lead tables.

## Apollo.io scope
Apollo is used only for lead sourcing into `master_leads`. Not used for email sending, sequences, or outreach. All sending happens via n8n through Gmail (nick@numat.ph) or via Next.js API routes calling Resend.

## n8n outreach workflow rules
Every new workflow must include:

1. `SEQUENCE_NAME` and `FORMAT_VERSION` constants at the top of the first Code node.
2. A Supabase HTTP Request node after every Send Email node, logging to `sequence_events` with fields: `email`, `company`, `country`, `sequence_name`, `sequence_step`, `email_subject`, `format_version`, `event_type` (set to `"sent"`), `rooms`.

Weekly report sends to mark@numat.ph every Monday 8am MYT.

## n8n technical constraints (v2.16 / v2.17, learned the hard way)
- Code nodes do NOT support `$helpers`, `URLSearchParams`, `fetch`, or browser/Node globals. Use dedicated HTTP Request nodes for HTTP calls.
- HTTP Request nodes use Raw body mode with `JSON.stringify()` on the payload object.
- Supabase REST requires both `apikey` and `Authorization: Bearer ...` headers added manually. The built in Supabase node sometimes drops one.
- Single row PostgREST returns are flat objects, not arrays. Adjust downstream nodes accordingly.

## Source of truth hierarchy
1. Actual reports and dashboards
2. Bank transactions
3. Source documents (invoices, contracts, purchase orders)
4. Supabase records

Transcripts are context only. Verify numbers against documents or DB before including in board materials, investor updates, or financial dashboards.

## Adhesives (RI Chemical Corp, Pasig City)
- R22 017 PRF resin: Phenol Resorcinol Formaldehyde
- R22 012 PF resin: Phenol Formaldehyde
- R21 036 LoFoUF: low formaldehyde Urea Formaldehyde, H351 suspected carcinogen

All HMIS Health 2, non regulated transport. Storage range 10 to 35 degrees C.

## Capacity and operations
- Single shift production: 360 boards per month
- Double shift production: 570 boards per month (no capex required for the jump)
- USD 100K capacity scaling model walks production from 360 to 2,500 boards per month
- Malaysia factory relocation is an open board level discussion item

## Existential risks (April 2026 audit)
1. Labor cost overrun at 5x model
2. Certification gaps blocking hotel and international sales
3. Single person technology dependency (Nick)

These are not abstract: they directly inform engineering, hiring, and roadmap decisions. When prioritizing technical work, prefer changes that reduce the third risk (better docs, agent infrastructure, clearer system inventory).

## Investor and governance
- Backed by Wavemaker Impact (WMI)
- Paul Lam: key investor
- Quarterly board reporting; financials must reconcile against bank and source documents before slides go out

## Output formatting (inherits global)
- No hyphens or dashes in prose (commas, colons, parentheses, or new sentences instead).
- HTML deliverables, dashboards, financial reports use white or light backgrounds.

## Execution preferences (inherits global)
- Proceed autonomously to completion.
- Full file replacements over snippets.
- Always provide PowerShell git commands.

## Key contacts
- Mark Sebastian: CEO
- Bryan Suarin: COO, runs Philippines leads
- Mohan Louis: Head of Growth, runs international leads and is also CRO of Kastelon
- Nick: Business Administrator, owns technology and ops

## Git workflow and branch protection
The `main` branch is protected on GitHub: direct pushes are rejected, and changes must go through a pull request. The global rule "always commit and push to main" is overridden for this repo. Standard flow:

1. Branch off main: `git checkout -b feature-name`
2. Commit on the feature branch
3. Push with upstream tracking: `git push -u origin feature-name`
4. Open a PR via the URL GitHub returns, or via `gh pr create --base main --head feature-name --title "..." --body "..."`
5. Merge in the GitHub UI; Vercel deploys from main on merge

The `gh` CLI is not installed on this Windows machine. Install with `winget install GitHub.cli` if you want PR creation from PowerShell; otherwise open the PR URL in a browser.
