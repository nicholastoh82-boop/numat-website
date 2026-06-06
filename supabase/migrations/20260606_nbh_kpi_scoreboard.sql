-- 20260606_nbh_kpi_scoreboard.sql
-- NuBam Hybrid KPI scoreboard: product line, tags, amakan tracking,
-- targets, push config, access rule (numat.ph plus Arran and Amanda),
-- and the nbh_scoreboard() function that computes weekly and monthly actuals.
-- Idempotent: safe to run more than once.

-- 1. Tagging on leads and samples
alter table public.master_leads add column if not exists product_focus text;
alter table public.lead_samples add column if not exists product_focus text;

-- 2. Amakan core tracking on board runs (existing table is veneer centric)
alter table public.prod_board_runs add column if not exists amakan_layers integer;
alter table public.prod_board_runs add column if not exists amakan_sheets_consumed numeric;

-- 3. Product line (hidden from public site until launch) and first real variant
insert into public.products (name, description, unit, is_active, is_featured, slug, moq_unit)
select 'NuBam Hybrid',
 'Hybrid engineered bamboo board: two engineered bamboo veneer faces over a woven amakan core. Thickness scales by adding amakan layers.',
 'sheet', false, false, 'nubam-hybrid', 'sheets'
where not exists (select 1 from public.products where slug='nubam-hybrid');

insert into public.product_variants (product_id, core_type, thickness_mm, length_mm, width_mm, size_label, sku, is_active, is_available, unit)
select p.id, 'amakan', 12, 2440, 1220, '2440 x 1220 x 12 mm (8ft x 4ft sheet)', 'NBH_2440x1220x12', false, false, 'sheet'
from public.products p
where p.slug='nubam-hybrid'
and not exists (select 1 from public.product_variants v where v.sku='NBH_2440x1220x12');

-- 4. Targets and push config tables
create table if not exists public.nbh_kpi_targets (
  id uuid primary key default gen_random_uuid(),
  kpi_key text unique not null,
  kpi_name text not null,
  owner_key text not null,
  owner_label text not null,
  category text not null,
  metric_type text not null,
  weekly_target numeric,
  monthly_target numeric,
  target_basis text not null,
  target_note text,
  data_source text,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.nbh_config (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);

-- 5. Row Level Security: numat.ph domain plus Arran and Amanda read, leadership writes
alter table public.nbh_kpi_targets enable row level security;
alter table public.nbh_config enable row level security;

drop policy if exists nbh_targets_read on public.nbh_kpi_targets;
create policy nbh_targets_read on public.nbh_kpi_targets for select to authenticated
using (
  lower(auth.jwt() ->> 'email') like '%@numat.ph'
  or lower(auth.jwt() ->> 'email') in ('arran@100x100.com','amanda@100x100.com')
);
drop policy if exists nbh_targets_write on public.nbh_kpi_targets;
create policy nbh_targets_write on public.nbh_kpi_targets for all to authenticated
using (auth.uid() in (select user_id from public.user_roles where role in ('admin','ceo')))
with check (auth.uid() in (select user_id from public.user_roles where role in ('admin','ceo')));

drop policy if exists nbh_config_read on public.nbh_config;
create policy nbh_config_read on public.nbh_config for select to authenticated
using (
  lower(auth.jwt() ->> 'email') like '%@numat.ph'
  or lower(auth.jwt() ->> 'email') in ('arran@100x100.com','amanda@100x100.com')
);
drop policy if exists nbh_config_write on public.nbh_config;
create policy nbh_config_write on public.nbh_config for all to authenticated
using (auth.uid() in (select user_id from public.user_roles where role in ('admin','ceo')))
with check (auth.uid() in (select user_id from public.user_roles where role in ('admin','ceo')));

-- 6. Push window
insert into public.nbh_config (key, value) values
 ('push_start','2026-06-08'),('push_end','2026-09-06'),('push_weeks','13'),
 ('push_label','NuBam Hybrid 3 month accelerated push')
on conflict (key) do update set value=excluded.value, updated_at=now();

-- 7. Fair and equitable targets, weekly and monthly
insert into public.nbh_kpi_targets
 (kpi_key, kpi_name, owner_key, owner_label, category, metric_type, weekly_target, monthly_target, target_basis, target_note, data_source, sort_order) values
 ('mohan_qual_opps','Qualified international opportunities','mohan','Mohan (international)','sales_intl','count',3,12,'fixed','Accelerated weekly run rate.','master_leads: product_focus NuBam Hybrid, country not Philippines, stage qualified or later, in period',10),
 ('mohan_samples','Samples sent to qualified buyers','mohan','Mohan (international)','sales_intl','count',4,16,'fixed','Subject to B22 sample capacity.','lead_samples: product_focus NuBam Hybrid, status dispatched or delivered, in period',20),
 ('mohan_orders_won','International orders won','mohan','Mohan (international)','sales_intl','count',null,3,'ramp','Month 1: 1, Month 2: 2, Month 3: 3. Value tracked, no value target until average order value is set.','master_leads: stage won, international, in period',30),
 ('mohan_conv','Sample to order conversion %','mohan','Mohan (international)','sales_intl','percent',null,20,'baseline_then_improve','Measure baseline month 1, target about 20% by month 3.','derived: orders won over samples sent',40),
 ('mohan_cycle','Days from first contact to order','mohan','Mohan (international)','sales_intl','days',null,null,'track_only','Measure baseline, aim to cut about 15% by month 3.','master_leads timestamps',50),
 ('eugene_meetings','New Philippine accounts or meetings','eugene','Eugene (Philippines)','sales_ph','count',4,16,'fixed','About one per working day.','master_leads: country Philippines, appointment set in period',10),
 ('eugene_qual_opps','Qualified domestic opportunities','eugene','Eugene (Philippines)','sales_ph','count',3,12,'fixed','','master_leads: Philippines, stage qualified or later, in period',20),
 ('eugene_samples','Samples sent to Philippine buyers','eugene','Eugene (Philippines)','sales_ph','count',4,16,'fixed','','lead_samples: product_focus NuBam Hybrid, Philippines, in period',30),
 ('eugene_orders_won','Domestic orders won','eugene','Eugene (Philippines)','sales_ph','count',null,3,'ramp','Month 1: 1, Month 2: 2, Month 3: 3. Credit to Eugene, not Bryan. Value tracked, no value target until average order value is set.','master_leads: Philippines, stage won, in period',40),
 ('cmo_leads','Qualified leads generated','cmo','Marketing (incoming CMO)','marketing','count',6,24,'fixed','Depends on channels and budget.','master_leads: product_focus NuBam Hybrid, source marketing, in period',10),
 ('cmo_cpl','Cost per qualified lead','cmo','Marketing (incoming CMO)','marketing','value',null,null,'track_only','Set a ceiling once monthly budget is fixed.','marketing spend over qualified leads',20),
 ('cmo_pipeline','Marketing influenced pipeline %','cmo','Marketing (incoming CMO)','marketing','percent',null,30,'baseline_then_improve','Target marketing touching at least 30% of pipeline value by month 3.','pipeline attribution',30),
 ('cmo_sourced_rev','Marketing sourced orders','cmo','Marketing (incoming CMO)','marketing','count',null,1,'baseline_then_improve','At least one order that started from marketing by month 3.','master_leads: source marketing, stage won',40),
 ('cmo_page','Product page interest','cmo','Marketing (incoming CMO)','marketing','count',null,null,'track_only','Measure baseline, grow visits and inquiries about 50% by month 3.','website analytics and inquiries',50),
 ('b22_cost_board','Cost per board, actual vs target','b22','B22 production (Bryan, COO)','production','value',null,null,'track_only','Lock target cost after first 2 to 3 runs, then keep actual within plus 5%.','prod_board_runs with adhesive and material costs',10),
 ('b22_yield','Yield %','b22','B22 production (Bryan, COO)','production','percent',null,88,'ramp','Month 1 baseline, month 2 at least 80%, month 3 at least 88%.','prod_board_runs: boards_passed over boards_produced',20),
 ('b22_reject','Reject rate %','b22','B22 production (Bryan, COO)','production','percent',null,8,'ramp','Month 1 baseline, month 2 under 12%, month 3 under 8%.','prod_board_runs: defects over boards_produced',30),
 ('b22_output','Output vs plan %','b22','B22 production (Bryan, COO)','production','percent',null,90,'baseline_then_improve','Set monthly output plan once capacity is known, then hit at least 90%.','prod_board_runs boards_produced vs plan',40),
 ('b22_ontime','Orders completed on time %','b22','B22 production (Bryan, COO)','production','percent',null,90,'baseline_then_improve','Measure baseline, reach at least 90% on time by month 3.','master_leads order_completed_at vs promised date',50),
 ('b22_amakan','Amakan core utilization','b22','B22 production (Bryan, COO)','production','percent',null,null,'baseline_then_improve','Measure waste percent, cut about 20% by month 3.','prod_board_runs: amakan_sheets_consumed vs standard',60)
on conflict (kpi_key) do nothing;

-- 8. Scoreboard function: weekly and monthly actuals, Manila time
create or replace function public.nbh_scoreboard()
returns table(
  kpi_key text, kpi_name text, owner_key text, owner_label text,
  category text, metric_type text,
  weekly_target numeric, monthly_target numeric,
  target_basis text, target_note text,
  week_actual numeric, month_actual numeric, sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
with p as (
  select
    date_trunc('week',  (now() at time zone 'Asia/Manila')::date)::date as wk_start,
    (date_trunc('week', (now() at time zone 'Asia/Manila')::date)::date + 7) as wk_end,
    date_trunc('month', (now() at time zone 'Asia/Manila')::date)::date as mo_start,
    (date_trunc('month',(now() at time zone 'Asia/Manila')::date) + interval '1 month')::date as mo_end
),
ml as (
  select
    (created_at at time zone 'Asia/Manila')::date as created_d,
    (order_completed_at at time zone 'Asia/Manila')::date as completed_d,
    (appointment_date at time zone 'Asia/Manila')::date as appt_d,
    (coalesce(lower(country),'') like 'phil%' or upper(coalesce(country,'')) = 'PH') as is_ph,
    lower(coalesce(pipeline_stage,'')) as stage_l,
    (lower(coalesce(source,'')) like '%market%' or lower(coalesce(lead_source,'')) like '%market%' or lower(coalesce(segment,'')) like '%market%') as is_mktg,
    id
  from master_leads
  where product_focus = 'NuBam Hybrid'
),
ls as (
  select s.sent_at,
    (coalesce(lower(m.country),'') like 'phil%' or upper(coalesce(m.country,'')) = 'PH') as is_ph
  from lead_samples s
  left join master_leads m on m.id = s.lead_id
  where s.product_focus = 'NuBam Hybrid'
),
pbr as (
  select r.event_date, r.boards_produced, r.boards_passed, r.defects, r.amakan_sheets_consumed
  from prod_board_runs r
  where coalesce(r.voided,false) = false
    and r.variant_id in (
      select v.id from product_variants v join products pr on pr.id = v.product_id
      where pr.slug = 'nubam-hybrid'
    )
),
act as (
  select 'mohan_qual_opps' as k,
    count(*) filter (where not is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','won','closed won') and created_d >= (select wk_start from p) and created_d < (select wk_end from p))::numeric as w,
    count(*) filter (where not is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','won','closed won') and created_d >= (select mo_start from p) and created_d < (select mo_end from p))::numeric as m
  from ml
  union all
  select 'mohan_orders_won',
    count(*) filter (where not is_ph and stage_l in ('won','closed won') and completed_d >= (select wk_start from p) and completed_d < (select wk_end from p)),
    count(*) filter (where not is_ph and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
  from ml
  union all
  select 'eugene_qual_opps',
    count(*) filter (where is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','won','closed won') and created_d >= (select wk_start from p) and created_d < (select wk_end from p)),
    count(*) filter (where is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','won','closed won') and created_d >= (select mo_start from p) and created_d < (select mo_end from p))
  from ml
  union all
  select 'eugene_meetings',
    count(*) filter (where is_ph and appt_d >= (select wk_start from p) and appt_d < (select wk_end from p)),
    count(*) filter (where is_ph and appt_d >= (select mo_start from p) and appt_d < (select mo_end from p))
  from ml
  union all
  select 'eugene_orders_won',
    count(*) filter (where is_ph and stage_l in ('won','closed won') and completed_d >= (select wk_start from p) and completed_d < (select wk_end from p)),
    count(*) filter (where is_ph and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
  from ml
  union all
  select 'cmo_leads',
    count(*) filter (where is_mktg and created_d >= (select wk_start from p) and created_d < (select wk_end from p)),
    count(*) filter (where is_mktg and created_d >= (select mo_start from p) and created_d < (select mo_end from p))
  from ml
  union all
  select 'cmo_sourced_rev',
    count(*) filter (where is_mktg and stage_l in ('won','closed won') and completed_d >= (select wk_start from p) and completed_d < (select wk_end from p)),
    count(*) filter (where is_mktg and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
  from ml
  union all
  select 'mohan_samples',
    count(*) filter (where not coalesce(is_ph,false) and sent_at >= (select wk_start from p) and sent_at < (select wk_end from p)),
    count(*) filter (where not coalesce(is_ph,false) and sent_at >= (select mo_start from p) and sent_at < (select mo_end from p))
  from ls
  union all
  select 'eugene_samples',
    count(*) filter (where coalesce(is_ph,false) and sent_at >= (select wk_start from p) and sent_at < (select wk_end from p)),
    count(*) filter (where coalesce(is_ph,false) and sent_at >= (select mo_start from p) and sent_at < (select mo_end from p))
  from ls
  union all
  select 'b22_yield',
    round(100.0 * sum(boards_passed) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)),0), 1),
    round(100.0 * sum(boards_passed) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)),0), 1)
  from pbr
  union all
  select 'b22_reject',
    round(100.0 * sum(defects) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)),0), 1),
    round(100.0 * sum(defects) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)),0), 1)
  from pbr
  union all
  select 'b22_output',
    sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p))::numeric,
    sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p))::numeric
  from pbr
  union all
  select 'b22_amakan',
    round(sum(amakan_sheets_consumed) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)),0), 2),
    round(sum(amakan_sheets_consumed) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)),0), 2)
  from pbr
  union all
  select 'mohan_conv',
    null::numeric,
    round(100.0 * (select count(*) from ml where not is_ph and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
      / nullif((select count(*) from ls where not coalesce(is_ph,false) and sent_at >= (select mo_start from p) and sent_at < (select mo_end from p)),0), 1)
)
select
  t.kpi_key, t.kpi_name, t.owner_key, t.owner_label, t.category, t.metric_type,
  t.weekly_target, t.monthly_target, t.target_basis, t.target_note,
  a.w as week_actual, a.m as month_actual, t.sort_order
from nbh_kpi_targets t
left join act a on a.k = t.kpi_key
where t.is_active = true
order by
  case t.owner_key when 'mohan' then 1 when 'eugene' then 2 when 'cmo' then 3 when 'b22' then 4 else 5 end,
  t.sort_order;
$$;

grant execute on function public.nbh_scoreboard() to authenticated;

-- ============================================================
-- NuBam Hybrid input wiring (second pass, applied 2026-06-06)
--   1. marketing_sourced flag on master_leads (CMO attribution)
--   2. hybrid variant ply_count = 2 so board runs validate
--   3. nbh_scoreboard() rebuilt to honor marketing_sourced and
--      to count meeting_booked as a qualified opportunity
-- ============================================================

alter table public.master_leads
  add column if not exists marketing_sourced boolean not null default false;

update public.product_variants v
  set ply_count = 2
  from public.products p
  where p.id = v.product_id and p.slug = 'nubam-hybrid'
    and (v.ply_count is null or v.ply_count = 0);

create or replace function public.nbh_scoreboard()
 returns table(kpi_key text, kpi_name text, owner_key text, owner_label text, category text, metric_type text, weekly_target numeric, monthly_target numeric, target_basis text, target_note text, week_actual numeric, month_actual numeric, sort_order integer)
 language sql
 stable security definer
 set search_path to 'public'
as $function$
with p as (
  select
    date_trunc('week',  (now() at time zone 'Asia/Manila')::date)::date as wk_start,
    (date_trunc('week', (now() at time zone 'Asia/Manila')::date)::date + 7) as wk_end,
    date_trunc('month', (now() at time zone 'Asia/Manila')::date)::date as mo_start,
    (date_trunc('month',(now() at time zone 'Asia/Manila')::date) + interval '1 month')::date as mo_end
),
ml as (
  select
    (created_at at time zone 'Asia/Manila')::date as created_d,
    (order_completed_at at time zone 'Asia/Manila')::date as completed_d,
    (appointment_date at time zone 'Asia/Manila')::date as appt_d,
    (coalesce(lower(country),'') like 'phil%' or upper(coalesce(country,'')) = 'PH') as is_ph,
    lower(coalesce(pipeline_stage,'')) as stage_l,
    (coalesce(marketing_sourced,false) or lower(coalesce(source,'')) like '%market%' or lower(coalesce(lead_source,'')) like '%market%' or lower(coalesce(segment,'')) like '%market%') as is_mktg,
    id
  from master_leads
  where product_focus = 'NuBam Hybrid'
),
ls as (
  select s.sent_at,
    (coalesce(lower(m.country),'') like 'phil%' or upper(coalesce(m.country,'')) = 'PH') as is_ph
  from lead_samples s
  left join master_leads m on m.id = s.lead_id
  where s.product_focus = 'NuBam Hybrid'
),
pbr as (
  select r.event_date, r.boards_produced, r.boards_passed, r.defects, r.amakan_sheets_consumed
  from prod_board_runs r
  where coalesce(r.voided,false) = false
    and r.variant_id in (
      select v.id from product_variants v join products pr on pr.id = v.product_id
      where pr.slug = 'nubam-hybrid'
    )
),
act as (
  select 'mohan_qual_opps' as k,
    count(*) filter (where not is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','meeting_booked','won','closed won') and created_d >= (select wk_start from p) and created_d < (select wk_end from p))::numeric as w,
    count(*) filter (where not is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','meeting_booked','won','closed won') and created_d >= (select mo_start from p) and created_d < (select mo_end from p))::numeric as m
  from ml
  union all
  select 'mohan_orders_won',
    count(*) filter (where not is_ph and stage_l in ('won','closed won') and completed_d >= (select wk_start from p) and completed_d < (select wk_end from p)),
    count(*) filter (where not is_ph and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
  from ml
  union all
  select 'eugene_qual_opps',
    count(*) filter (where is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','meeting_booked','won','closed won') and created_d >= (select wk_start from p) and created_d < (select wk_end from p)),
    count(*) filter (where is_ph and stage_l in ('qualified','negotiating','proposal sent','proposal_sent','meeting_booked','won','closed won') and created_d >= (select mo_start from p) and created_d < (select mo_end from p))
  from ml
  union all
  select 'eugene_meetings',
    count(*) filter (where is_ph and appt_d >= (select wk_start from p) and appt_d < (select wk_end from p)),
    count(*) filter (where is_ph and appt_d >= (select mo_start from p) and appt_d < (select mo_end from p))
  from ml
  union all
  select 'eugene_orders_won',
    count(*) filter (where is_ph and stage_l in ('won','closed won') and completed_d >= (select wk_start from p) and completed_d < (select wk_end from p)),
    count(*) filter (where is_ph and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
  from ml
  union all
  select 'cmo_leads',
    count(*) filter (where is_mktg and created_d >= (select wk_start from p) and created_d < (select wk_end from p)),
    count(*) filter (where is_mktg and created_d >= (select mo_start from p) and created_d < (select mo_end from p))
  from ml
  union all
  select 'cmo_sourced_rev',
    count(*) filter (where is_mktg and stage_l in ('won','closed won') and completed_d >= (select wk_start from p) and completed_d < (select wk_end from p)),
    count(*) filter (where is_mktg and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
  from ml
  union all
  select 'mohan_samples',
    count(*) filter (where not coalesce(is_ph,false) and sent_at >= (select wk_start from p) and sent_at < (select wk_end from p)),
    count(*) filter (where not coalesce(is_ph,false) and sent_at >= (select mo_start from p) and sent_at < (select mo_end from p))
  from ls
  union all
  select 'eugene_samples',
    count(*) filter (where coalesce(is_ph,false) and sent_at >= (select wk_start from p) and sent_at < (select wk_end from p)),
    count(*) filter (where coalesce(is_ph,false) and sent_at >= (select mo_start from p) and sent_at < (select mo_end from p))
  from ls
  union all
  select 'b22_yield',
    round(100.0 * sum(boards_passed) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)),0), 1),
    round(100.0 * sum(boards_passed) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)),0), 1)
  from pbr
  union all
  select 'b22_reject',
    round(100.0 * sum(defects) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)),0), 1),
    round(100.0 * sum(defects) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)),0), 1)
  from pbr
  union all
  select 'b22_output',
    sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p))::numeric,
    sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p))::numeric
  from pbr
  union all
  select 'b22_amakan',
    round(sum(amakan_sheets_consumed) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select wk_start from p) and event_date < (select wk_end from p)),0), 2),
    round(sum(amakan_sheets_consumed) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)) / nullif(sum(boards_produced) filter (where event_date >= (select mo_start from p) and event_date < (select mo_end from p)),0), 2)
  from pbr
  union all
  select 'mohan_conv',
    null::numeric,
    round(100.0 * (select count(*) from ml where not is_ph and stage_l in ('won','closed won') and completed_d >= (select mo_start from p) and completed_d < (select mo_end from p))
      / nullif((select count(*) from ls where not coalesce(is_ph,false) and sent_at >= (select mo_start from p) and sent_at < (select mo_end from p)),0), 1)
)
select
  t.kpi_key, t.kpi_name, t.owner_key, t.owner_label, t.category, t.metric_type,
  t.weekly_target, t.monthly_target, t.target_basis, t.target_note,
  a.w as week_actual, a.m as month_actual, t.sort_order
from nbh_kpi_targets t
left join act a on a.k = t.kpi_key
where t.is_active = true
order by
  case t.owner_key when 'mohan' then 1 when 'eugene' then 2 when 'cmo' then 3 when 'b22' then 4 else 5 end,
  t.sort_order;
$function$;

grant execute on function public.nbh_scoreboard() to authenticated;
