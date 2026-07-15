-- 20260609_portal_documents.sql
-- Documents and safety. A shared library for SOPs, role manuals, safety data
-- sheets, and certifications. Files live in a private bucket. Every signed in
-- staff member can open a document, only admins upload or delete. Reached
-- through the server with the service role. Idempotent.

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Other',
  title text not null,
  file_path text not null,
  file_name text,
  notes text,
  uploaded_by uuid,
  uploaded_by_email text,
  created_at timestamptz not null default now()
);
create index if not exists documents_category_idx
  on public.documents (category, created_at desc);

alter table public.documents enable row level security;
