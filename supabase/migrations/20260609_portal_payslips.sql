-- 20260609_portal_payslips.sql
-- Payslips. Files live in a private storage bucket. This table indexes which
-- payslip belongs to which person. A person reads only their own rows, admins
-- read all. All writes and all file access go through the server with the
-- service role. Idempotent.

insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

create table if not exists public.payslips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  period text not null,
  file_path text not null,
  file_name text,
  uploaded_by uuid,
  uploaded_by_email text,
  created_at timestamptz not null default now()
);
create index if not exists payslips_user_idx
  on public.payslips (user_id, created_at desc);

alter table public.payslips enable row level security;

drop policy if exists payslips_read on public.payslips;
create policy payslips_read on public.payslips
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'admin'
    )
  );
