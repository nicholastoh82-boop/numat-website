-- 20260609_portal_staff_salaries.sql
-- Fixed monthly salary for the staff who are on a set salary (management and a
-- few leaders). Weekly factory workers are not listed here; their payslips use
-- actual payouts instead. Read by the server with the service role only.

create table if not exists public.staff_salaries (
  staff_id uuid primary key references public.fin_staff(id) on delete cascade,
  monthly_salary numeric not null,
  currency text not null,
  updated_at timestamptz not null default now()
);

alter table public.staff_salaries enable row level security;
