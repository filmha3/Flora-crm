-- Already applied to the Flora Crm project via Supabase MCP (2026-11-24). Safe to re-run.
-- Pre-sale projects: project → floors → units. Every row is owned by one agent (RLS).
create table if not exists public.presale_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  name text not null,
  cover_image text,
  facade_front_image text,
  facade_back_image text,
  facade_side_images jsonb not null default '[]'::jsonb,
  total_floors int not null check (total_floors between 1 and 60),
  settings jsonb not null default '{}'::jsonb,   -- areas palette, default price/sqm, wall color
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.presale_floors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null references public.presale_projects(id) on delete cascade,
  floor_number int not null,
  floor_order int not null,
  unit_count int not null default 0,
  layout_configuration jsonb not null default '{}'::jsonb,
  unique (project_id, floor_number)
);
create table if not exists public.presale_units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  project_id uuid not null references public.presale_projects(id) on delete cascade,
  floor_id uuid not null references public.presale_floors(id) on delete cascade,
  unit_number text not null,
  area numeric not null check (area > 0),
  bedrooms int,
  price numeric,
  price_per_sqm numeric,
  status text not null default 'available' check (status in ('available','sold','reserved')),
  buyer_name text,
  sale_date text,
  payment_terms text,
  notes text,
  position_configuration jsonb not null default '{}'::jsonb,  -- { order, row }
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists presale_floors_project_idx on public.presale_floors (project_id);
create index if not exists presale_units_project_idx on public.presale_units (project_id);
create index if not exists presale_units_floor_idx on public.presale_units (floor_id);

create or replace function public.presale_touch() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists presale_projects_touch on public.presale_projects;
create trigger presale_projects_touch before update on public.presale_projects for each row execute function public.presale_touch();
drop trigger if exists presale_units_touch on public.presale_units;
create trigger presale_units_touch before update on public.presale_units for each row execute function public.presale_touch();

do $$ declare t text; begin
  foreach t in array array['presale_projects','presale_floors','presale_units'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "owner all" on public.%I', t);
    execute format('create policy "owner all" on public.%I for all using (auth.uid() = user_id) with check (auth.uid() = user_id)', t);
  end loop;
end $$;
