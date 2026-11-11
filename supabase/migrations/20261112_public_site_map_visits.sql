-- Run once in Supabase → SQL Editor BEFORE deploying the new frontend.
-- 1) Map location + thumbnail + structured specs on published properties
alter table public.public_properties
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists cover_thumb_path text,
  add column if not exists details jsonb default '{}'::jsonb;

-- 2) Visit requests from the public site (written only by the visit-request
--    edge function with the service role; agents read their own rows).
create table if not exists public.visit_requests (
  id uuid primary key default gen_random_uuid(),
  property_id text not null,
  user_id uuid not null,
  property_title text,
  name text,
  phone text not null,
  preferred_time text,
  note text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);
create index if not exists visit_requests_user_idx on public.visit_requests (user_id, created_at desc);
alter table public.visit_requests enable row level security;
drop policy if exists "owner reads visit requests" on public.visit_requests;
create policy "owner reads visit requests" on public.visit_requests
  for select using (auth.uid() = user_id);
drop policy if exists "owner updates visit requests" on public.visit_requests;
create policy "owner updates visit requests" on public.visit_requests
  for update using (auth.uid() = user_id);
