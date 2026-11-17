-- Phase 5: Empathy Mapper.
--
-- An empathy map records what a person SAYS, THINKS, DOES and FEELS. Says and Does are what you
-- observed; Thinks and Feels are what you infer. Every note can cite an observation from a
-- synthesis, and a note with no citation is shown as "Assumed", never dressed up as evidence.
--
-- The subject of a map is either a persona (optional) or a typed label such as "First-time home
-- cook" or "Participant P3", so a map can be made before any persona exists.
--
-- Privacy: notes can describe real people. Everything here is owner-only under Row Level Security
-- and nothing is publicly readable.

------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------

create table public.empathy_maps (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  -- Optional. Deleting the persona keeps the map; the typed subject below still names who it is about.
  persona_id    uuid references public.personas (id) on delete set null,
  title         text not null check (char_length(btrim(title)) between 1 and 160),
  -- Who the map is about when it is not linked to a persona (the app also copies a persona's name here).
  subject       text check (subject is null or char_length(btrim(subject)) between 1 and 120),
  -- The situation the map describes, for example "Planning dinner on a weeknight".
  context       text check (context is null or char_length(context) <= 2000),
  -- Quadrants the researcher has deliberately marked "not yet researched". Unknown stays unknown:
  -- an empty quadrant is either still to do or marked here, never silently complete.
  not_researched text[] not null default '{}'
                  check (not_researched <@ array['says', 'thinks', 'does', 'feels']::text[]),
  status        text not null default 'draft' check (status in ('draft', 'completed')),
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint empathy_maps_completed_consistency check ((status = 'completed') = (completed_at is not null))
);

create index empathy_maps_owner_updated_idx on public.empathy_maps (owner_id, updated_at desc);
create index empathy_maps_project_idx       on public.empathy_maps (project_id);
create index empathy_maps_persona_idx       on public.empathy_maps (persona_id);

create trigger empathy_maps_set_updated_at
  before update on public.empathy_maps
  for each row execute function public.set_updated_at();

create table public.empathy_items (
  id             uuid primary key default gen_random_uuid(),
  map_id         uuid not null references public.empathy_maps (id) on delete cascade,
  quadrant       text not null check (quadrant in ('says', 'thinks', 'does', 'feels')),
  content        text not null check (char_length(btrim(content)) between 1 and 500),
  -- Where this came from: a note, and optionally an observation from a synthesis.
  -- With no observation linked, the note is an assumption and is labelled as one.
  evidence_note  text check (evidence_note is null or char_length(evidence_note) <= 500),
  observation_id uuid references public.research_observations (id) on delete set null,
  position       integer not null default 0 check (position >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index empathy_items_quadrant_idx    on public.empathy_items (map_id, quadrant, position);
create index empathy_items_observation_idx on public.empathy_items (observation_id);

create trigger empathy_items_set_updated_at
  before update on public.empathy_items
  for each row execute function public.set_updated_at();

-- Editing a note counts as editing the map, so "Edited 2 minutes ago" and Recent stay honest.
create or replace function public.touch_empathy_map()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.empathy_maps set updated_at = now()
  where id = coalesce(new.map_id, old.map_id);
  return coalesce(new, old);
end;
$$;

revoke all on function public.touch_empathy_map() from public, anon, authenticated;

create trigger empathy_items_touch after insert or update or delete on public.empathy_items
  for each row execute function public.touch_empathy_map();

------------------------------------------------------------------------------
-- Row Level Security: owner only, with parent ownership checked on every child row.
------------------------------------------------------------------------------

create or replace function public.is_empathy_map_owner(p_map_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.empathy_maps m
    where m.id = p_map_id and m.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_empathy_map_owner(uuid) from public, anon;
grant execute on function public.is_empathy_map_owner(uuid) to authenticated;

revoke all on public.empathy_maps, public.empathy_items from anon, authenticated;
grant select, insert, update, delete on public.empathy_maps, public.empathy_items to authenticated;

alter table public.empathy_maps  enable row level security;
alter table public.empathy_items enable row level security;
alter table public.empathy_maps  force row level security;
alter table public.empathy_items force row level security;

-- A map is owned by the caller, attached only to a project they own, and linked only to a persona
-- from that same project (the same rule journeys use).
create policy empathy_maps_select on public.empathy_maps for select to authenticated
  using (owner_id = (select auth.uid()));
create policy empathy_maps_insert on public.empathy_maps for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.is_project_owner(project_id)
    and (persona_id is null or public.is_project_persona(persona_id, project_id))
  );
create policy empathy_maps_update on public.empathy_maps for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid()) and public.is_project_owner(project_id)
    and (persona_id is null or public.is_project_persona(persona_id, project_id))
  );
create policy empathy_maps_delete on public.empathy_maps for delete to authenticated
  using (owner_id = (select auth.uid()));

-- A cited observation must be one the caller owns, so a map can't point at someone else's notes.
create policy empathy_items_all on public.empathy_items for all to authenticated
  using (public.is_empathy_map_owner(map_id))
  with check (
    public.is_empathy_map_owner(map_id)
    and (observation_id is null or public.is_observation_owner(observation_id))
  );

------------------------------------------------------------------------------
-- Helpers (run as the caller, so Row Level Security still applies)
------------------------------------------------------------------------------

-- Re-orders the notes of one map. The order of p_ids decides the position within each quadrant.
create or replace function public.reorder_empathy_items(p_map_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.empathy_items i
  set position = (k.ord - 1)::int * 10
  from unnest(p_ids) with ordinality as k(id, ord)
  where i.map_id = p_map_id and i.id = k.id;
$$;

-- Copies a map with its notes, for trying a second reading of the same subject.
create or replace function public.duplicate_empathy_map(p_map_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.empathy_maps (owner_id, project_id, persona_id, title, subject, context, not_researched, status)
  select auth.uid(), m.project_id, m.persona_id, left(m.title, 150) || ' (copy)', m.subject, m.context, m.not_researched, 'draft'
  from public.empathy_maps m
  where m.id = p_map_id
  returning id into new_id;

  if new_id is null then
    raise exception 'Empathy map not found' using errcode = 'P0002';
  end if;

  insert into public.empathy_items (map_id, quadrant, content, evidence_note, observation_id, position)
  select new_id, i.quadrant, i.content, i.evidence_note, i.observation_id, i.position
  from public.empathy_items i
  where i.map_id = p_map_id;

  return new_id;
end;
$$;

revoke all on function public.reorder_empathy_items(uuid, uuid[]) from public, anon;
revoke all on function public.duplicate_empathy_map(uuid)         from public, anon;
grant execute on function public.reorder_empathy_items(uuid, uuid[]) to authenticated;
grant execute on function public.duplicate_empathy_map(uuid)         to authenticated;
