-- Rep productivity scoreboard function and WhatsApp click tracking table.
-- Applied live via Supabase; recorded here for version control.

create or replace function crm_rep_scoreboard(period_days int default 30)
returns table (
  rep_email text,
  new_leads bigint,
  inbound_leads bigint,
  active_pipeline bigint,
  touched bigint,
  replies bigint,
  activities bigint,
  stale bigint,
  won bigint
) language sql stable security definer set search_path = public as $$
  with ts as (select now() - make_interval(days => period_days) as since),
  reps as (
    select distinct rep_email from master_leads
      where rep_email is not null and rep_email like '%@numat.ph'
        and rep_email not in ('mohan@numat.ph','eugene@numat.ph')
    union select 'erica@numat.ph' union select 'bryan@numat.ph'
  )
  select r.rep_email,
    (select count(*) from master_leads m where m.rep_email=r.rep_email and m.created_at >= (select since from ts)),
    (select count(*) from master_leads m where m.rep_email=r.rep_email and m.created_at >= (select since from ts) and m.source_type like 'inbound_%'),
    (select count(*) from master_leads m where m.rep_email=r.rep_email and m.pipeline_stage in ('contacted','qualified','proposal_sent','negotiating')),
    (select count(*) from master_leads m where m.rep_email=r.rep_email and m.last_rep_touch_at >= (select since from ts)),
    (select count(*) from master_leads m where m.rep_email=r.rep_email and m.replied_at >= (select since from ts)),
    (select count(*) from sales_activities a where a.actor=r.rep_email and a.created_at >= (select since from ts)),
    (select count(*) from master_leads m where m.rep_email=r.rep_email and m.pipeline_stage in ('contacted','qualified','proposal_sent','negotiating') and (m.last_activity_at is null or m.last_activity_at < now() - interval '14 days')),
    (select count(*) from master_leads m where m.rep_email=r.rep_email and m.pipeline_stage='won' and m.updated_at >= (select since from ts))
  from reps r
  order by 2 desc;
$$;

grant execute on function crm_rep_scoreboard(int) to authenticated, anon, service_role;

create table if not exists whatsapp_clicks (
  id uuid primary key default gen_random_uuid(),
  path text,
  href text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table whatsapp_clicks enable row level security;

create index if not exists whatsapp_clicks_created_idx on whatsapp_clicks (created_at desc);
