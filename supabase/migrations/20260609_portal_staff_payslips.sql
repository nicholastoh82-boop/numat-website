-- 20260609_portal_staff_payslips.sql
-- Generated payslips. Built from verified salary payouts in fin_transactions,
-- one row per staff per month per currency, with the tranche breakdown stored
-- as earnings. A person reads only their own (matched by user_id), admins read
-- all. Writes are done by the server with the service role. Idempotent.

create table if not exists public.staff_payslips (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid,
  employee_name text not null,
  employee_role text,
  department text,
  employee_email text,
  user_id uuid,
  period text not null,
  period_label text not null,
  period_start date,
  period_end date,
  pay_date date,
  reference_no text,
  currency text not null,
  earnings jsonb not null default '[]'::jsonb,
  gross numeric not null default 0,
  deductions numeric not null default 0,
  net numeric not null default 0,
  generated_by uuid,
  generated_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (staff_id, period, currency)
);
create index if not exists staff_payslips_user_idx on public.staff_payslips (user_id, period desc);
create index if not exists staff_payslips_period_idx on public.staff_payslips (period desc);

alter table public.staff_payslips enable row level security;

drop policy if exists staff_payslips_read on public.staff_payslips;
create policy staff_payslips_read on public.staff_payslips
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid() and r.role = 'admin'
    )
  );
