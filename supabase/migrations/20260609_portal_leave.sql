-- 20260609_portal_leave.sql
-- Staff leave requests for the portal. A person reads their own requests,
-- admins read all. Writes are done by the server with the service role, so no
-- write policy is needed here. Idempotent: safe to run more than once.

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending',
  decided_by uuid,
  decided_by_email text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leave_requests_user_idx
  on public.leave_requests (user_id, created_at desc);
create index if not exists leave_requests_status_idx
  on public.leave_requests (status, created_at desc);

alter table public.leave_requests enable row level security;

drop policy if exists leave_requests_read on public.leave_requests;
create policy leave_requests_read on public.leave_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'admin'
    )
  );
