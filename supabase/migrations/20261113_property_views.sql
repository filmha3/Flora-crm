-- Public-site view counter for «آمار هفته» (weekly stats).
-- Run once in Supabase → SQL Editor.
create table if not exists public.property_views (
  id bigint generated always as identity primary key,
  property_id text not null,
  user_id uuid not null,
  created_at timestamptz not null default now()
);
create index if not exists property_views_user_idx on public.property_views (user_id, created_at desc);
alter table public.property_views enable row level security;
drop policy if exists "owner reads property views" on public.property_views;
create policy "owner reads property views" on public.property_views
  for select using (auth.uid() = user_id);

-- Anonymous visitors can only log a view through this function; the owning
-- agent is looked up server-side from public_properties (never trusted from
-- the client).
create or replace function public.log_property_view(p_property_id text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.property_views (property_id, user_id)
  select id, user_id from public.public_properties where id = p_property_id;
$$;
revoke all on function public.log_property_view(text) from public;
grant execute on function public.log_property_view(text) to anon, authenticated;
