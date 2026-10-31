-- Phase 3: project brief (shared context), Persona Builder and Competitor Analyzer.

------------------------------------------------------------------------------
-- Shared project brief. Modules inherit these and may override them locally
-- (the override lives in the module, never here), so there is one source of truth.
------------------------------------------------------------------------------

alter table public.projects
  add column product_service     text check (product_service is null or char_length(product_service) <= 2000),
  add column target_audience     text check (target_audience is null or char_length(target_audience) <= 2000),
  add column research_objectives text check (research_objectives is null or char_length(research_objectives) <= 2000);

------------------------------------------------------------------------------
-- Personas
------------------------------------------------------------------------------

create table public.personas (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 120),
  -- Always shown in the UI and exports, so nobody mistakes a hypothesis for research.
  persona_type text not null default 'hypothesis'
                 check (persona_type in ('research_backed', 'hypothesis', 'proto')),
  status       text not null default 'draft' check (status in ('draft', 'completed')),
  current_step smallint not null default 1 check (current_step between 1 and 6),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint personas_completed_consistency check ((status = 'completed') = (completed_at is not null))
);

create index personas_owner_updated_idx on public.personas (owner_id, updated_at desc);
create index personas_project_idx       on public.personas (project_id);

create trigger personas_set_updated_at
  before update on public.personas
  for each row execute function public.set_updated_at();

create table public.persona_sections (
  id         uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas (id) on delete cascade,
  key        text not null check (key ~ '^[a-z_]{1,50}$'),
  position   integer not null default 0 check (position >= 0),
  content    jsonb not null default '{}'::jsonb
               check (jsonb_typeof(content) = 'object' and octet_length(content::text) <= 200000),
  source     text not null default 'manual' check (source in ('manual', 'template', 'ai')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint persona_sections_unique_key unique (persona_id, key)
);

create trigger persona_sections_set_updated_at
  before update on public.persona_sections
  for each row execute function public.set_updated_at();

-- Evidence rows: sources, observations, quotes, assumptions and hypotheses.
-- Quotes are only ever what a user typed in; `origin` marks anything machine-written.
create table public.persona_evidence (
  id                uuid primary key default gen_random_uuid(),
  persona_id        uuid not null references public.personas (id) on delete cascade,
  kind              text not null
                      check (kind in ('research_source', 'observation', 'quote', 'assumption', 'hypothesis')),
  content           text not null check (char_length(btrim(content)) between 1 and 2000),
  source_label      text check (source_label is null or char_length(source_label) <= 300),
  source_url        text check (source_url is null or (char_length(source_url) <= 2048 and source_url ~* '^https?://[^[:space:]]+$')),
  participant_ref   text check (participant_ref is null or char_length(participant_ref) <= 120),
  confidence        text check (confidence is null or confidence in ('high', 'medium', 'low')),
  validation_status text not null default 'unvalidated'
                      check (validation_status in ('unvalidated', 'validated', 'invalidated')),
  origin            text not null default 'manual' check (origin in ('manual', 'ai')),
  position          integer not null default 0 check (position >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index persona_evidence_persona_idx on public.persona_evidence (persona_id, position);

create trigger persona_evidence_set_updated_at
  before update on public.persona_evidence
  for each row execute function public.set_updated_at();

create or replace function public.touch_persona()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.personas set updated_at = now()
  where id = coalesce(new.persona_id, old.persona_id);
  return coalesce(new, old);
end;
$$;

revoke all on function public.touch_persona() from public, anon, authenticated;

create trigger persona_sections_touch after insert or update on public.persona_sections
  for each row execute function public.touch_persona();
create trigger persona_evidence_touch after insert or update or delete on public.persona_evidence
  for each row execute function public.touch_persona();

------------------------------------------------------------------------------
-- Competitor analyses
------------------------------------------------------------------------------

create table public.competitor_analyses (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  title          text not null check (char_length(btrim(title)) between 1 and 160),
  status         text not null default 'draft' check (status in ('draft', 'completed')),
  current_step   smallint not null default 1 check (current_step between 1 and 6),
  completed_at   timestamptz,
  -- Validated by the application (Zod); the database bounds shape and size.
  market_context jsonb not null default '{}'::jsonb
                   check (jsonb_typeof(market_context) = 'object' and octet_length(market_context::text) <= 100000),
  analysis       jsonb not null default '{}'::jsonb
                   check (jsonb_typeof(analysis) = 'object' and octet_length(analysis::text) <= 200000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint competitor_analyses_completed_consistency check ((status = 'completed') = (completed_at is not null))
);

create index competitor_analyses_owner_updated_idx on public.competitor_analyses (owner_id, updated_at desc);
create index competitor_analyses_project_idx       on public.competitor_analyses (project_id);

create trigger competitor_analyses_set_updated_at
  before update on public.competitor_analyses
  for each row execute function public.set_updated_at();

create table public.competitors (
  id              uuid primary key default gen_random_uuid(),
  analysis_id     uuid not null references public.competitor_analyses (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 160),
  website_url     text check (website_url is null or (char_length(website_url) <= 2048 and website_url ~* '^https?://[^[:space:]]+$')),
  competitor_type text not null default 'direct'
                    check (competitor_type in ('direct', 'indirect', 'substitute', 'emerging')),
  description     text check (description is null or char_length(description) <= 2000),
  target_audience text check (target_audience is null or char_length(target_audience) <= 1000),
  positioning     text check (positioning is null or char_length(positioning) <= 1000),
  pricing_info    text check (pricing_info is null or char_length(pricing_info) <= 1000),
  research_date   date,
  position        integer not null default 0 check (position >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- Lets child rows prove they belong to the same analysis (composite foreign keys below).
  constraint competitors_analysis_id_unique unique (analysis_id, id)
);

create index competitors_analysis_position_idx on public.competitors (analysis_id, position);

create trigger competitors_set_updated_at
  before update on public.competitors
  for each row execute function public.set_updated_at();

create table public.competitor_criteria (
  id          uuid primary key default gen_random_uuid(),
  analysis_id uuid not null references public.competitor_analyses (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 160),
  category    text not null default 'custom'
                check (category in ('core_features', 'capabilities', 'pricing', 'user_experience',
                                    'accessibility', 'integrations', 'support', 'positioning',
                                    'target_audience', 'custom')),
  description text check (description is null or char_length(description) <= 500),
  position    integer not null default 0 check (position >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint competitor_criteria_analysis_id_unique unique (analysis_id, id)
);

create unique index competitor_criteria_unique_name on public.competitor_criteria (analysis_id, lower(btrim(name)));
create index competitor_criteria_analysis_position_idx on public.competitor_criteria (analysis_id, position);

create trigger competitor_criteria_set_updated_at
  before update on public.competitor_criteria
  for each row execute function public.set_updated_at();

create table public.competitor_sources (
  id            uuid primary key default gen_random_uuid(),
  analysis_id   uuid not null,
  competitor_id uuid not null,
  url           text not null check (char_length(url) <= 2048 and url ~* '^https?://[^[:space:]]+$'),
  title         text check (title is null or char_length(title) <= 300),
  source_type   text not null default 'website'
                  check (source_type in ('website', 'pricing_page', 'product_page', 'review', 'article', 'interview', 'other')),
  retrieved_on  date,
  -- Who produced this source record. Future automated research must record 'automated'.
  origin        text not null default 'manual' check (origin in ('manual', 'automated', 'ai')),
  notes         text check (notes is null or char_length(notes) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint competitor_sources_competitor_fk
    foreign key (analysis_id, competitor_id) references public.competitors (analysis_id, id) on delete cascade,
  constraint competitor_sources_competitor_id_unique unique (competitor_id, id)
);

create index competitor_sources_analysis_idx on public.competitor_sources (analysis_id, competitor_id);

create trigger competitor_sources_set_updated_at
  before update on public.competitor_sources
  for each row execute function public.set_updated_at();

-- One cell of the comparison matrix. "unknown" and "unavailable" are real states:
-- missing information is recorded as such and never treated as a weakness.
create table public.competitor_comparisons (
  id            uuid primary key default gen_random_uuid(),
  analysis_id   uuid not null,
  competitor_id uuid not null,
  criterion_id  uuid not null,
  source_id     uuid,
  value         text check (value is null or char_length(value) <= 1000),
  status        text not null default 'unknown'
                  check (status in ('known', 'unknown', 'unavailable', 'not_applicable')),
  notes         text check (notes is null or char_length(notes) <= 2000),
  origin        text not null default 'manual' check (origin in ('manual', 'automated', 'ai')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint competitor_comparisons_unique_cell unique (competitor_id, criterion_id),
  -- Competitor, criterion and source must all belong to this analysis.
  constraint competitor_comparisons_competitor_fk
    foreign key (analysis_id, competitor_id) references public.competitors (analysis_id, id) on delete cascade,
  constraint competitor_comparisons_criterion_fk
    foreign key (analysis_id, criterion_id) references public.competitor_criteria (analysis_id, id) on delete cascade,
  constraint competitor_comparisons_source_fk
    foreign key (competitor_id, source_id) references public.competitor_sources (competitor_id, id)
    on delete set null (source_id)
);

create index competitor_comparisons_analysis_idx on public.competitor_comparisons (analysis_id);
create index competitor_comparisons_criterion_idx on public.competitor_comparisons (criterion_id);

create trigger competitor_comparisons_set_updated_at
  before update on public.competitor_comparisons
  for each row execute function public.set_updated_at();

create or replace function public.touch_competitor_analysis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.competitor_analyses set updated_at = now()
  where id = coalesce(new.analysis_id, old.analysis_id);
  return coalesce(new, old);
end;
$$;

revoke all on function public.touch_competitor_analysis() from public, anon, authenticated;

create trigger competitors_touch after insert or update or delete on public.competitors
  for each row execute function public.touch_competitor_analysis();
create trigger competitor_criteria_touch after insert or update or delete on public.competitor_criteria
  for each row execute function public.touch_competitor_analysis();
create trigger competitor_sources_touch after insert or update or delete on public.competitor_sources
  for each row execute function public.touch_competitor_analysis();
create trigger competitor_comparisons_touch after insert or update or delete on public.competitor_comparisons
  for each row execute function public.touch_competitor_analysis();

------------------------------------------------------------------------------
-- Row Level Security: owner only, with parent ownership checked on every child row.
------------------------------------------------------------------------------

create or replace function public.is_persona_owner(p_persona_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.personas p
    where p.id = p_persona_id and p.owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_analysis_owner(p_analysis_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.competitor_analyses a
    where a.id = p_analysis_id and a.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_persona_owner(uuid)  from public, anon;
revoke all on function public.is_analysis_owner(uuid) from public, anon;
grant execute on function public.is_persona_owner(uuid)  to authenticated;
grant execute on function public.is_analysis_owner(uuid) to authenticated;

revoke all on public.personas, public.persona_sections, public.persona_evidence,
              public.competitor_analyses, public.competitors, public.competitor_criteria,
              public.competitor_sources, public.competitor_comparisons from anon, authenticated;
grant select, insert, update, delete on public.personas, public.persona_sections, public.persona_evidence,
              public.competitor_analyses, public.competitors, public.competitor_criteria,
              public.competitor_sources, public.competitor_comparisons to authenticated;

alter table public.personas             enable row level security;
alter table public.persona_sections     enable row level security;
alter table public.persona_evidence     enable row level security;
alter table public.competitor_analyses  enable row level security;
alter table public.competitors          enable row level security;
alter table public.competitor_criteria  enable row level security;
alter table public.competitor_sources   enable row level security;
alter table public.competitor_comparisons enable row level security;

alter table public.personas             force row level security;
alter table public.persona_sections     force row level security;
alter table public.persona_evidence     force row level security;
alter table public.competitor_analyses  force row level security;
alter table public.competitors          force row level security;
alter table public.competitor_criteria  force row level security;
alter table public.competitor_sources   force row level security;
alter table public.competitor_comparisons force row level security;

-- Top-level records: owned by the caller and attached only to a project they own.
create policy personas_select on public.personas for select to authenticated
  using (owner_id = (select auth.uid()));
create policy personas_insert on public.personas for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));
create policy personas_update on public.personas for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));
create policy personas_delete on public.personas for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy competitor_analyses_select on public.competitor_analyses for select to authenticated
  using (owner_id = (select auth.uid()));
create policy competitor_analyses_insert on public.competitor_analyses for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));
create policy competitor_analyses_update on public.competitor_analyses for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));
create policy competitor_analyses_delete on public.competitor_analyses for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Persona children
create policy persona_sections_all on public.persona_sections for all to authenticated
  using (public.is_persona_owner(persona_id)) with check (public.is_persona_owner(persona_id));
create policy persona_evidence_all on public.persona_evidence for all to authenticated
  using (public.is_persona_owner(persona_id)) with check (public.is_persona_owner(persona_id));

-- Competitor children (every child row carries analysis_id)
create policy competitors_all on public.competitors for all to authenticated
  using (public.is_analysis_owner(analysis_id)) with check (public.is_analysis_owner(analysis_id));
create policy competitor_criteria_all on public.competitor_criteria for all to authenticated
  using (public.is_analysis_owner(analysis_id)) with check (public.is_analysis_owner(analysis_id));
create policy competitor_sources_all on public.competitor_sources for all to authenticated
  using (public.is_analysis_owner(analysis_id)) with check (public.is_analysis_owner(analysis_id));
create policy competitor_comparisons_all on public.competitor_comparisons for all to authenticated
  using (public.is_analysis_owner(analysis_id)) with check (public.is_analysis_owner(analysis_id));

------------------------------------------------------------------------------
-- RPCs (SECURITY INVOKER: they run under the caller's RLS)
------------------------------------------------------------------------------

create or replace function public.duplicate_persona(p_persona_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
begin
  insert into public.personas (owner_id, project_id, name, persona_type, status, current_step)
  select auth.uid(), p.project_id, left(p.name, 110) || ' (copy)', p.persona_type, 'draft', 1
  from public.personas p
  where p.id = p_persona_id
  returning id into new_id;

  if new_id is null then
    raise exception 'Persona not found' using errcode = 'P0002';
  end if;

  insert into public.persona_sections (persona_id, key, position, content, source)
  select new_id, s.key, s.position, s.content, s.source
  from public.persona_sections s where s.persona_id = p_persona_id;

  insert into public.persona_evidence
    (persona_id, kind, content, source_label, source_url, participant_ref, confidence, validation_status, origin, position)
  select new_id, e.kind, e.content, e.source_label, e.source_url, e.participant_ref, e.confidence,
         e.validation_status, e.origin, e.position
  from public.persona_evidence e where e.persona_id = p_persona_id;

  return new_id;
end;
$$;

create or replace function public.reorder_competitors(p_analysis_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.competitors c
  set position = (k.ord - 1)::int * 10
  from unnest(p_ids) with ordinality as k(id, ord)
  where c.analysis_id = p_analysis_id and c.id = k.id;
$$;

create or replace function public.reorder_competitor_criteria(p_analysis_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.competitor_criteria c
  set position = (k.ord - 1)::int * 10
  from unnest(p_ids) with ordinality as k(id, ord)
  where c.analysis_id = p_analysis_id and c.id = k.id;
$$;

revoke all on function public.duplicate_persona(uuid) from public, anon;
revoke all on function public.reorder_competitors(uuid, uuid[]) from public, anon;
revoke all on function public.reorder_competitor_criteria(uuid, uuid[]) from public, anon;
grant execute on function public.duplicate_persona(uuid) to authenticated;
grant execute on function public.reorder_competitors(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_competitor_criteria(uuid, uuid[]) to authenticated;
