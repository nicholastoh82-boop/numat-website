-- 20260609_portal_announcements.sql
-- Company announcements for the portal. Any signed in user can read.
-- Writes are done by the server with the service role (admin only), so no
-- write policy is needed here. Idempotent: safe to run more than once.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_by uuid,
  created_by_email text,
  created_at timestamptz not null default now()
);

create index if not exists announcements_created_at_idx
  on public.announcements (created_at desc);

alter table public.announcements enable row level security;

drop policy if exists announcements_read on public.announcements;
create policy announcements_read on public.announcements
  for select to authenticated
  using (true);
