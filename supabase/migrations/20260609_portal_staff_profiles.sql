-- 20260609_portal_staff_profiles.sql
-- Optional self added details for the staff directory. Names and emails come
-- from Google login, this only holds a job title and phone each person can set
-- for themselves. Read and write go through the server with the service role.
-- Idempotent.

create table if not exists public.staff_profiles (
  user_id uuid primary key,
  title text,
  phone text,
  updated_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;
