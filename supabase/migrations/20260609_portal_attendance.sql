-- 20260609_portal_attendance.sql
-- Clock in and clock out events for staff, with location when shared. A person
-- reads their own events, admins read all. Writes are done by the server with
-- the service role. Idempotent: safe to run more than once.

create table if not exists public.clock_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  event_type text not null,
  latitude numeric,
  longitude numeric,
  accuracy numeric,
  created_at timestamptz not null default now()
);

create index if not exists clock_events_user_idx
  on public.clock_events (user_id, created_at desc);
create index if not exists clock_events_created_idx
  on public.clock_events (created_at desc);

alter table public.clock_events enable row level security;

drop policy if exists clock_events_read on public.clock_events;
create policy clock_events_read on public.clock_events
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'admin'
    )
  );
