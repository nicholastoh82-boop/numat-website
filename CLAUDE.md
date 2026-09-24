# NUMAT Sustainable Manufacturing: numatbamboo.com

This repo is the production sales site, the in house CRM, the staff portal, the finance system and the lead capture surface for NUMAT. Every future session in this repo follows the rules below.

> Inherits global rules from `C:\Users\nicho\.claude\CLAUDE.md`. The notes below extend, never replace, those rules.

## 1. Stack
- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix)
- Hosting: Vercel. Production deploys automatically when a pull request merges into `main`.
- Database, auth, storage: Supabase project `peuwxnrojlfybdymkazj`
- Client state: zustand (cart), SWR (client fetches), zod and react hook form (forms)
- Email: SendGrid and Resend. WhatsApp: Twilio and `wa.me` links.
- Claude API calls go through Cloudflare AI Gateway only. Never call `api.anthropic.com` directly.
- n8n still runs older outreach workflows. New flows go into Next.js API routes.

## 2. Folder map
| Path | What lives there |
|---|---|
| `app/` | App Router pages. Public site pages sit at the top level (`/`, `/products`, `/about`, `/contact`, `/faq`, `/applications`, `/solutions`, `/blog`, `/news` and so on). |
| `app/products/` | `page.tsx` (catalogue) and `[id]/page.tsx` plus `[id]/ProductPageClient.tsx` (product detail, accepts a slug or a UUID) |
| `app/cart`, `app/request-quote`, `app/quote/confirmation` | Cart and quote request flow |
| `app/(shell)/` | Route group for signed in areas: `crm/`, `finance/`, `portal/(authed)/` |
| `app/admin/` | Admin screens: products, quotes, leads, inquiries, news, newsletter, testimonials |
| `app/api/` | API routes: `products`, `categories`, `cart/quote`, `quote/*`, `admin/*`, `crm/*`, `cron/*`, `portal/*`, `finance/*`, `webhooks/*` and others |
| `components/` | Site components (header, footer, cart drawer, chat and WhatsApp widgets). Subfolders: `products/`, `cart/`, `quote/`, `home/`, `crm/`, `admin/`, `portal/`, `finance/`, `ui/` (shadcn) |
| `lib/` | Data access and helpers: `products/get-product.ts`, `product-media.ts`, `product-image.ts`, `cart-store.ts`, `leads/inbound.ts`, `quotes/notify.ts`, `supabase/` clients, `portal/roles.ts`, `cron/` |
| `supabase/migrations/` | Dated SQL migrations. All schema, product and price changes land here. |
| `scripts/` | Legacy numbered SQL seeds. Reference only. |
| `public/` | Static images and PDFs. Product images live in `public/products/<product>/`; older site photos in `public/nuweave/`. |
| `middleware.ts` | Auth and route gating, including the `/crm` block |

## 3. Product and pricing data flow
1. Product rows live in Supabase tables `products`, `product_variants`, `product_images` and `categories`. Uploaded images go to the Supabase storage bucket `products`.
2. `/products` (`app/products/page.tsx`) queries active products and shows a "from" price equal to the lowest active, available variant `base_price_php`.
3. `/products/[id]` loads the product and variants through `lib/products/get-product.ts` and renders in `ProductPageClient.tsx`. The image carousel is `components/products/product-gallery.tsx`. Curated gallery images and sales copy per product live in `lib/product-media.ts` (never prices).
4. The header and footer product menus load from `/api/products`.
5. Prices are stored in PHP. The currency switcher (`components/providers/currency-provider`, `/api/exchange-rate`) converts on the client for display only.
6. The cart (`lib/cart-store.ts`, persisted in the browser) submits to `/request-quote`, which posts to `app/api/cart/quote/route.ts`. That route writes `quotes` and `quote_items`, upserts the lead into `master_leads` via `lib/leads/inbound.ts`, and emails the team and the customer. There is no online card payment today.

## 4. Pricing rules (hard)
- Prices come only from Supabase `product_variants`, using rows where `is_active = true` and `is_available = true`, reading `base_price_php`.
- Never hardcode a price in code, copy, metadata, structured data or images. The old static price lists (`lib/products.ts`, `lib/product-config.ts`) were deleted; do not recreate them.
- Any server route that accepts a cart must look prices up again from Supabase and never trust a price sent by the browser.
- Price changes are made through a migration in `supabase/migrations/` or through the admin screens, never in page code.

## 5. Products (hard)
The only products that may appear anywhere customer facing, spelled exactly: NuForm, NuForm Lite, NuWev, NuBrid.

| Product | What it is | URL slug |
|---|---|---|
| NuForm | Concrete formwork board, phenolic film on both faces | `nuform` |
| NuForm Lite | Lighter, lower cost NuForm for standard pours. Sold on the NuForm page (`product_variants.grade = 'Lite'`; NuForm rows use `'Standard'`) | `nuform` |
| NuWev | Decorative indoor wall cladding, or a substrate for lamination. Never describe it as formwork. | `nuweave` (unchanged) |
| NuBrid | MDF substitute | `nuhybrid` (unchanged) |

- NuBam CLB is discontinued. It must not appear on any customer facing page, menu, sitemap, structured data, download or email.
- There is no "NuForm Prime". Never write it.
- Never use these names: BambooMDF, BambooPlywood, Bamboo Decking, NuWall, NuDoor, NuFloor, NuSlat. Correct them on sight in customer facing code.
- The URL slugs `nuweave` and `nuhybrid` stay unchanged even though the display names differ. Do not add redirects that rename them.

## 6. Copy rules (hard, site and email)
- No certification, fire rating, acoustic rating, LEED, ASTM rating, Class A or Class B claims in site copy, spec tables, metadata or downloads. NUMAT does not hold these. This applies even when a sales kit or brochure contains such a claim (for example the kit's "Class B (ASTM E84)" and "E1" lines).
- Exception, approved by Nick: the existing DOST Region X test results (ASTM D1037 mechanical tests, as published on `/testing`, the NuForm technical sheet and the DOST PDF) may be shown exactly as published. Do not add new figures or restate them as a certification.
- Reuse figure: use only the existing site figure for NuForm, "8 to 10 pours, versus 4 to 5 for marine plywood". Do not publish the sales kit's 16 or 23 to 25 pour figures. NuForm Lite has no published reuse figure yet.
- Outbound WhatsApp templates (`lib/whatsapp-templates.ts`) and the `/ve-report` page content stay as they are unless Nick asks for a change (the `/ve-report` gallery tags were renamed from old product lines only).
- No hyphens or dashes (`-`, `–`, `—`) in any user facing copy. Rewrite with commas, colons, parentheses or new sentences. Hyphens are fine only inside code identifiers, slugs and file names.
- No emoji in user facing copy.
- Expand acronyms on first use.
- Any change to outbound email content (subject, body, signature, call to action) needs Nick's review first. Show the proposed diff before editing a live template.
- Website pages, dashboards and HTML deliverables use white or light backgrounds.

## 7. CRM at /crm
- Lives in `app/(shell)/crm/` (dashboard, outreach, scoreboard, signals, production forecast and QC, schematic estimator). The main screen is `app/(shell)/crm/dashboard/page.tsx`. Drawers and modals are in `components/crm/`. API routes are `app/api/crm/*`.
- Access requires a signed in numat.ph user (`requirePortalUser()`) with the `crm` feature (`requireFeature('crm')`), both in `lib/portal/roles.ts`.
- It reads `master_leads`, `quotes`, `quote_items`, `lead_payments`, `crm_users`, `crm_viewer_settings`, `receipts` and `lead_samples`.
- Current state: `middleware.ts` redirects `/crm/*` to `/` and returns 404 for `/api/crm/*`. Do not remove that block unless Nick asks.

## 8. Website submissions (orders and enquiries)
- Every public form goes through `lib/leads/website-intake.ts`: checkout order requests (`app/api/cart/quote`), the contact form (`app/api/inquiries`), the quick capture bars (`app/api/capture-lead`), the project qualification form (`app/api/qualify/submit`) and NARA chatbot leads (`app/api/webhooks/nara-lead`).
- Alerts go to `WEBSITE_ALERT_RECIPIENTS`: nick@numat.ph, bryan@numat.ph, erica@numat.ph (plus sales@ where it already was). Change recipients there only.
- Each submission is appended as a row to the `website` tab of the NUMAT Near Term Revenue Tracker Google Sheet (columns: Submitted, Reference, Type, Source, Name, Company, Email, Phone, Products and quantities, Order value (PHP), Preferred reply, Application, Customer message, Assigned to, Status, Follow up notes). The team edits Status and Follow up notes by hand; code only appends.
- The tracker is `NUMAT_Near_Term_Revenue_Tracker.xlsx` in Google Drive (file ID `1TIwmgHhd5lbS0ucR4z8DbevGtptoE5T2`), already shared with the team, so it stays an .xlsx. The site downloads it, appends to the `website` tab only via `lib/leads/xlsx-append.ts` (every other part of the workbook is kept byte for byte), and uploads it back as a new revision of the same file. If it is ever converted to a native Google Sheet, the Sheets API path is used automatically.
- The file must be shared as Editor with `gemini-cron-runner@numat-automation.iam.gserviceaccount.com`, and the Google Drive API must be enabled in the `numat-automation` GCP project. Auth uses the Workload Identity Federation helper `lib/cron/gcp_auth.ts`, which only works on Vercel.
- Sheet logging never blocks or fails a submission; failures are logged as `[Website sheet]`.
- Unfinished checkouts: the checkout form calls `app/api/checkout-draft` as soon as a valid email or phone is typed, which upserts the lead into `master_leads` with `last_activity_type = 'checkout_started'`. Submitting overwrites it. The cron `app/api/cron/unfinished-checkouts` (every 30 minutes, in `vercel.json`) reports leads still in that state after 30 minutes to the tracker and in one alert email, then marks them `checkout_unfinished`.
- Price requests: when a board has no price (for example NuForm Lite), the product page shows `components/products/price-request-form.tsx`, which posts to `app/api/capture-lead` with `source: 'price-request'`.
- Analytics: use `track()` from `lib/analytics.ts` (GA4 ecommerce names: view_item, add_to_cart, begin_checkout, generate_lead).

## 9. Leads
- Every lead from any source inserts into `master_leads`. Use `source` and `segment` to tell them apart. Never create a new lead table.
- Philippines leads: bryan@numat.ph, cal.com/bryan-suarin-rxvhte/discovery
- International leads: mohan@numat.ph, cal.com/mohanlouis/discovery
- Nick: cal.com/numatnicholas/discovery
- Lemuel and Arlene resigned in April 2026. Never reference or assign to them.

## 10. Workflow (hard)
Never push to `main`. It is protected, and Vercel deploys from it.

1. Start from an up to date main and create a branch per change:
   ```powershell
   git checkout main; git pull; git checkout -b feat/short-description
   ```
2. Make the change.
3. Run the build and lint locally and fix every error before committing:
   ```powershell
   npm run build; if ($?) { npm run lint }
   ```
   Note: ESLint is not yet in `package.json`, so `npm run lint` fails until it is added. Local builds need `.env.local` with the Supabase URL and anon key; admin routes also expect `SUPABASE_SERVICE_ROLE_KEY`.
4. Commit and push the branch:
   ```powershell
   git add -A; git commit -m "Plain description of the change"; git push -u origin feat/short-description
   ```
5. Open a pull request into `main` with a plain summary of what changed and why (no jargon). The `gh` CLI is not installed; use the URL that `git push` prints, or install it with `winget install GitHub.cli`.
6. Nick merges in the GitHub UI.

## 11. Source of truth for numbers
1. Actual reports and dashboards
2. Bank transactions
3. Source documents (invoices, contracts, purchase orders)
4. Supabase records

Transcripts are context only. Verify any figure before it goes into site copy, board material or investor communication.

## 12. Key contacts
- Mark Sebastian: CEO
- Bryan Suarin: COO, Philippines leads
- Mohan Louis: Head of Growth, international leads
- Nick Toh: Business Administrator, owns technology and operations
