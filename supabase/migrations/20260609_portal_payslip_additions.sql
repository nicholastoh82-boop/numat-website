-- 20260609_portal_payslip_additions.sql
-- One off extras for a management payslip: bonuses or reimbursements. These are
-- not in the finance ledger as such, so an admin records them here and they show
-- on the payslip when that month is generated. Read by the server with the
-- service role only. Factory staff do not use this; they stay on weekly payout.

create table if not exists public.payslip_additions (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.fin_staff(id) on delete cascade,
  period text not null,
  kind text not null,
  description text,
  amount numeric not null,
  currency text not null,
  created_by uuid,
  created_by_email text,
  created_at timestamptz not null default now()
);
create index if not exists payslip_additions_lookup on public.payslip_additions (period, staff_id);

alter table public.payslip_additions enable row level security;
