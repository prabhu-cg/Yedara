-- Research Planner: research_plans + research_plan_sections, RLS, and RPCs.

------------------------------------------------------------------------------
-- research_plans
------------------------------------------------------------------------------

create table public.research_plans (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 160),
  status       text not null default 'draft' check (status in ('draft', 'completed')),
  current_step smallint not null default 1 check (current_step between 1 and 7),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint research_plans_completed_consistency
    check ((status = 'completed') = (completed_at is not null))
);

create index research_plans_owner_updated_idx on public.research_plans (owner_id, updated_at desc);
create index research_plans_project_idx       on public.research_plans (project_id);
create index research_plans_owner_status_idx  on public.research_plans (owner_id, status);

create trigger research_plans_set_updated_at
  before update on public.research_plans
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- research_plan_sections: one row per section, structured content as JSONB.
-- The shape of `content` per `key` is validated by the application (Zod);
-- the database enforces that it is a JSON object of bounded size.
------------------------------------------------------------------------------

create table public.research_plan_sections (
  id         uuid primary key default gen_random_uuid(),
  plan_id    uuid not null references public.research_plans (id) on delete cascade,
  key        text not null check (key ~ '^[a-z_]{1,50}$'),
  position   integer not null default 0 check (position >= 0),
  content    jsonb not null default '{}'::jsonb
               check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000),
  -- Where the content came from, so AI-generated drafts can be told apart later.
  source     text not null default 'manual' check (source in ('manual', 'template', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_plan_sections_unique_key unique (plan_id, key)
);

create index research_plan_sections_plan_position_idx
  on public.research_plan_sections (plan_id, position);

create trigger research_plan_sections_set_updated_at
  before update on public.research_plan_sections
  for each row execute function public.set_updated_at();

-- Editing a section bumps the plan's "last edited" timestamp.
create or replace function public.touch_research_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.research_plans set updated_at = now() where id = new.plan_id;
  return new;
end;
$$;

revoke all on function public.touch_research_plan() from public, anon, authenticated;

create trigger research_plan_sections_touch_plan
  after insert or update on public.research_plan_sections
  for each row execute function public.touch_research_plan();

------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------

create or replace function public.is_plan_owner(p_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.research_plans p
    where p.id = p_plan_id and p.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_plan_owner(uuid) from public, anon;
grant execute on function public.is_plan_owner(uuid) to authenticated;

revoke all on public.research_plans         from anon, authenticated;
revoke all on public.research_plan_sections from anon, authenticated;
grant select, insert, update, delete on public.research_plans         to authenticated;
grant select, insert, update, delete on public.research_plan_sections to authenticated;

alter table public.research_plans enable row level security;
alter table public.research_plans force row level security;

create policy research_plans_select_own on public.research_plans
  for select to authenticated
  using (owner_id = (select auth.uid()));

-- A plan can only be attached to a project the user owns.
create policy research_plans_insert_own on public.research_plans
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));

create policy research_plans_update_own on public.research_plans
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));

create policy research_plans_delete_own on public.research_plans
  for delete to authenticated
  using (owner_id = (select auth.uid()));

alter table public.research_plan_sections enable row level security;
alter table public.research_plan_sections force row level security;

create policy research_plan_sections_select_own on public.research_plan_sections
  for select to authenticated
  using (public.is_plan_owner(plan_id));

create policy research_plan_sections_insert_own on public.research_plan_sections
  for insert to authenticated
  with check (public.is_plan_owner(plan_id));

create policy research_plan_sections_update_own on public.research_plan_sections
  for update to authenticated
  using (public.is_plan_owner(plan_id))
  with check (public.is_plan_owner(plan_id));

create policy research_plan_sections_delete_own on public.research_plan_sections
  for delete to authenticated
  using (public.is_plan_owner(plan_id));

------------------------------------------------------------------------------
-- RPCs (SECURITY INVOKER: they run under the caller's RLS, never above it)
------------------------------------------------------------------------------

-- Atomically copies a plan and its sections into a new draft.
create or replace function public.duplicate_research_plan(p_plan_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.research_plans (owner_id, project_id, title, status, current_step)
  select auth.uid(), p.project_id, left(p.title, 150) || ' (copy)', 'draft', 1
  from public.research_plans p
  where p.id = p_plan_id
  returning id into new_id;

  if new_id is null then
    raise exception 'Research plan not found' using errcode = 'P0002';
  end if;

  insert into public.research_plan_sections (plan_id, key, position, content, source)
  select new_id, s.key, s.position, s.content, s.source
  from public.research_plan_sections s
  where s.plan_id = p_plan_id;

  return new_id;
end;
$$;

-- Sets section positions to the order of the given keys (spaced by 10).
create or replace function public.reorder_research_plan_sections(p_plan_id uuid, p_keys text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.research_plan_sections s
  set position = (k.ord - 1)::int * 10
  from unnest(p_keys) with ordinality as k(key, ord)
  where s.plan_id = p_plan_id and s.key = k.key;
$$;

revoke all on function public.duplicate_research_plan(uuid) from public, anon;
revoke all on function public.reorder_research_plan_sections(uuid, text[]) from public, anon;
grant execute on function public.duplicate_research_plan(uuid) to authenticated;
grant execute on function public.reorder_research_plan_sections(uuid, text[]) to authenticated;
