-- 20260609_portal_buying.sql
-- Buying: a supplier list and purchase orders. Gated by the 'buying' feature.
-- Reached only through the server with the service role after the feature
-- check, so RLS is on with no policies. Idempotent.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references public.suppliers(id) on delete set null,
  supplier_name text,
  reference text,
  status text not null default 'draft',
  order_date date,
  expected_date date,
  currency text not null default 'PHP',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  notes text,
  created_by uuid,
  created_by_email text,
  created_at timestamptz not null default now()
);
create index if not exists purchase_orders_status_idx
  on public.purchase_orders (status, created_at desc);

alter table public.suppliers enable row level security;
alter table public.purchase_orders enable row level security;
