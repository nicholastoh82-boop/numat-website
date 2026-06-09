-- 20260609_portal_push.sql
-- Web push for the portal. Three tables, all reached only through the server
-- with the service role, so RLS is on with no policies (normal users get
-- nothing directly). Idempotent: safe to run more than once.

-- VAPID keys and subject, read server side only.
create table if not exists public.push_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

-- One row per device subscription.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- Outbox the service worker reads to show the notification text.
create table if not exists public.push_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  body text,
  url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists push_notifications_user_idx
  on public.push_notifications (user_id, read_at, created_at desc);

alter table public.push_config enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_notifications enable row level security;
