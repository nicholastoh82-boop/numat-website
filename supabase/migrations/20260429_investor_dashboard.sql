-- ============================================================
-- Investor Dashboard Tables
-- Applied via Supabase MCP on 29 Apr 2026
-- Project: peuwxnrojlfybdymkazj
-- ============================================================
-- Stores monthly financial snapshots and quarterly impact metrics
-- Read by /investors page on numatbamboo.com
-- ============================================================

create table if not exists financial_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  period_start date not null,
  period_end date not null,
  cash_ph_usd numeric(14,2) not null default 0,
  cash_sg_usd numeric(14,2) not null default 0,
  monthly_net_burn numeric(14,2) not null default 0,
  monthly_gross_outflow numeric(14,2) not null default 0,
  monthly_collections numeric(14,2) not null default 0,
  revenue_total numeric(14,2) not null default 0,
  revenue_prev_month numeric(14,2) not null default 0,
  cogs_total numeric(14,2) not null default 0,
  active_customers integer not null default 0,
  new_customers_this_period integer not null default 0,
  cumulative_raised numeric(14,2) not null default 0,
  fx_rate_php_usd numeric(8,4) not null default 55.0,
  opex_salaries numeric(14,2) not null default 0,
  opex_rent_utilities numeric(14,2) not null default 0,
  opex_materials numeric(14,2) not null default 0,
  opex_sales_marketing numeric(14,2) not null default 0,
  opex_software numeric(14,2) not null default 0,
  opex_professional numeric(14,2) not null default 0,
  rev_nubam_boards numeric(14,2) not null default 0,
  rev_nuwall numeric(14,2) not null default 0,
  rev_nudoor numeric(14,2) not null default 0,
  rev_nufloor numeric(14,2) not null default 0,
  rev_nuslat numeric(14,2) not null default 0,
  capacity_utilization_pct numeric(6,2) not null default 0,
  production_sheets_per_month integer not null default 0,
  capacity_sheets_per_month integer not null default 2400,
  breakeven_utilization_pct numeric(6,2) not null default 39.5,
  ltv_avg_order_value numeric(14,2) not null default 0,
  ltv_orders_per_year numeric(6,2) not null default 0,
  ltv_retention_years numeric(4,2) not null default 3.0,
  ltv_total numeric(14,2) not null default 0,
  cac_total numeric(14,2) not null default 0,
  pipeline_sourced integer not null default 0,
  pipeline_engaged integer not null default 0,
  pipeline_replied integer not null default 0,
  pipeline_discovery_booked integer not null default 0,
  pipeline_quoted integer not null default 0,
  pipeline_closed_won integer not null default 0,
  pipeline_weighted_value numeric(14,2) not null default 0,
  pipeline_avg_cycle_days integer not null default 0,
  ceo_commentary text,
  ceo_name text default 'Mark Sebastian',
  watchlist_items jsonb default '[]'::jsonb,
  risk_register jsonb default '[]'::jsonb,
  scenarios jsonb default '[]'::jsonb,
  is_published boolean not null default false,
  prepared_by text default 'Nicholas Toh',
  reviewed_by text default 'Mark Sebastian',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists financial_snapshots_period_idx on financial_snapshots(period_end);
create index if not exists financial_snapshots_published_idx on financial_snapshots(is_published, period_end desc);

create table if not exists impact_metrics (
  id uuid primary key default gen_random_uuid(),
  period_label text not null,
  period_start date not null,
  period_end date not null,
  co2_avoided_period_tonnes numeric(10,2) not null default 0,
  co2_avoided_cumulative_tonnes numeric(10,2) not null default 0,
  bamboo_sourced_hectares numeric(8,2) not null default 0,
  direct_employment_count integer not null default 0,
  methodology_note text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists impact_metrics_period_idx on impact_metrics(period_end);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists financial_snapshots_updated_at on financial_snapshots;
create trigger financial_snapshots_updated_at
  before update on financial_snapshots
  for each row execute function set_updated_at();

alter table financial_snapshots enable row level security;
alter table impact_metrics enable row level security;

drop policy if exists "Public read published snapshots" on financial_snapshots;
create policy "Public read published snapshots"
  on financial_snapshots for select
  using (is_published = true);

drop policy if exists "Public read published impact" on impact_metrics;
create policy "Public read published impact"
  on impact_metrics for select
  using (is_published = true);
