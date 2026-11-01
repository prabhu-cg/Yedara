-- Phase 4: Research Synthesizer and Journey Mapper.
--
-- Privacy: research notes can contain personal information. Everything here is owner-only
-- under Row Level Security, nothing is publicly readable, and uploaded files are never stored:
-- the browser reads a file, the person confirms what to keep, and only that text is saved.

------------------------------------------------------------------------------
-- Research Synthesizer
------------------------------------------------------------------------------

create table public.research_syntheses (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null check (char_length(btrim(title)) between 1 and 160),
  status     text not null default 'draft' check (status in ('draft', 'completed')),
  completed_at timestamptz,
  -- The editable parts of the report; validated by the application (Zod), bounded here.
  report     jsonb not null default '{}'::jsonb
               check (jsonb_typeof(report) = 'object' and octet_length(report::text) <= 200000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint research_syntheses_completed_consistency check ((status = 'completed') = (completed_at is not null))
);

create index research_syntheses_owner_updated_idx on public.research_syntheses (owner_id, updated_at desc);
create index research_syntheses_project_idx       on public.research_syntheses (project_id);

create trigger research_syntheses_set_updated_at
  before update on public.research_syntheses
  for each row execute function public.set_updated_at();

-- Where material came from: an interview, a survey export, a pasted file's name...
create table public.research_sources (
  id            uuid primary key default gen_random_uuid(),
  synthesis_id  uuid not null references public.research_syntheses (id) on delete cascade,
  name          text not null check (char_length(btrim(name)) between 1 and 200),
  source_type   text not null default 'other'
                  check (source_type in ('interview', 'observation_session', 'survey', 'document', 'other')),
  participant_ref text check (participant_ref is null or char_length(participant_ref) <= 120),
  conducted_on  date,
  notes         text check (notes is null or char_length(notes) <= 1000),
  -- Only the file's name and size are kept for reference. The file itself is never stored.
  file_name     text check (file_name is null or char_length(file_name) <= 255),
  file_size     integer check (file_size is null or file_size between 0 and 5000000),
  import_method text not null default 'manual' check (import_method in ('manual', 'paste', 'file')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint research_sources_synthesis_id_unique unique (synthesis_id, id)
);

create index research_sources_synthesis_idx on public.research_sources (synthesis_id, created_at);

create trigger research_sources_set_updated_at
  before update on public.research_sources
  for each row execute function public.set_updated_at();

-- One piece of evidence: an observation, quote, survey response or note.
create table public.research_observations (
  id              uuid primary key default gen_random_uuid(),
  synthesis_id    uuid not null references public.research_syntheses (id) on delete cascade,
  source_id       uuid,
  participant_ref text check (participant_ref is null or char_length(participant_ref) <= 120),
  kind            text not null default 'observation'
                    check (kind in ('observation', 'quote', 'survey_response', 'note')),
  content         text not null check (char_length(btrim(content)) between 1 and 2000),
  tags            jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(tags) = 'array' and jsonb_array_length(tags) <= 20 and octet_length(tags::text) <= 2000),
  position        integer not null default 0 check (position >= 0),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint research_observations_synthesis_id_unique unique (synthesis_id, id),
  -- A source must belong to the same synthesis. Deleting a source keeps its observations.
  constraint research_observations_source_fk
    foreign key (synthesis_id, source_id) references public.research_sources (synthesis_id, id)
    on delete set null (source_id)
);

create index research_observations_synthesis_idx on public.research_observations (synthesis_id, position);
create index research_observations_source_idx    on public.research_observations (source_id);

create trigger research_observations_set_updated_at
  before update on public.research_observations
  for each row execute function public.set_updated_at();

create table public.research_themes (
  id           uuid primary key default gen_random_uuid(),
  synthesis_id uuid not null references public.research_syntheses (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 120),
  notes        text check (notes is null or char_length(notes) <= 2000),
  position     integer not null default 0 check (position >= 0),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint research_themes_synthesis_id_unique unique (synthesis_id, id)
);

create index research_themes_synthesis_idx on public.research_themes (synthesis_id, position);

create trigger research_themes_set_updated_at
  before update on public.research_themes
  for each row execute function public.set_updated_at();

-- One affinity board per synthesis.
create table public.affinity_boards (
  id           uuid primary key default gen_random_uuid(),
  synthesis_id uuid not null unique references public.research_syntheses (id) on delete cascade,
  zoom         numeric(3, 2) not null default 1 check (zoom between 0.5 and 1.5),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint affinity_boards_synthesis_id_unique unique (synthesis_id, id)
);

create trigger affinity_boards_set_updated_at
  before update on public.affinity_boards
  for each row execute function public.set_updated_at();

-- Where an observation sits on the board. theme_id null means "not grouped yet".
create table public.affinity_cards (
  id             uuid primary key default gen_random_uuid(),
  synthesis_id   uuid not null,
  board_id       uuid not null,
  observation_id uuid not null unique,
  theme_id       uuid,
  position       integer not null default 0 check (position >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint affinity_cards_board_fk
    foreign key (synthesis_id, board_id) references public.affinity_boards (synthesis_id, id) on delete cascade,
  constraint affinity_cards_observation_fk
    foreign key (synthesis_id, observation_id) references public.research_observations (synthesis_id, id) on delete cascade,
  -- Deleting a theme ungroups its cards; it never deletes evidence.
  constraint affinity_cards_theme_fk
    foreign key (synthesis_id, theme_id) references public.research_themes (synthesis_id, id)
    on delete set null (theme_id)
);

create index affinity_cards_board_idx on public.affinity_cards (board_id, theme_id, position);
create index affinity_cards_theme_idx on public.affinity_cards (theme_id);

create trigger affinity_cards_set_updated_at
  before update on public.affinity_cards
  for each row execute function public.set_updated_at();

create table public.research_insights (
  id                 uuid primary key default gen_random_uuid(),
  synthesis_id       uuid not null references public.research_syntheses (id) on delete cascade,
  theme_id           uuid,
  -- Never blur what the researcher saw with what they concluded.
  kind               text not null default 'interpretation'
                       check (kind in ('direct_observation', 'interpretation', 'hypothesis', 'recommendation')),
  observation        text check (observation is null or char_length(observation) <= 2000),
  pattern            text check (pattern is null or char_length(pattern) <= 1000),
  user_need          text check (user_need is null or char_length(user_need) <= 1000),
  problem_kind       text check (problem_kind is null or problem_kind in ('problem', 'opportunity')),
  problem_text       text check (problem_text is null or char_length(problem_text) <= 1000),
  statement          text not null check (char_length(btrim(statement)) between 1 and 1000),
  confidence         text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  recommended_action text check (recommended_action is null or char_length(recommended_action) <= 1000),
  position           integer not null default 0 check (position >= 0),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint research_insights_synthesis_id_unique unique (synthesis_id, id),
  constraint research_insights_theme_fk
    foreign key (synthesis_id, theme_id) references public.research_themes (synthesis_id, id)
    on delete set null (theme_id)
);

create index research_insights_synthesis_idx on public.research_insights (synthesis_id, position);

create trigger research_insights_set_updated_at
  before update on public.research_insights
  for each row execute function public.set_updated_at();

-- Evidence for an insight. The application requires at least one row per insight.
create table public.research_insight_evidence (
  insight_id     uuid not null,
  observation_id uuid not null,
  synthesis_id   uuid not null,
  created_at     timestamptz not null default now(),
  primary key (insight_id, observation_id),
  constraint research_insight_evidence_insight_fk
    foreign key (synthesis_id, insight_id) references public.research_insights (synthesis_id, id) on delete cascade,
  constraint research_insight_evidence_observation_fk
    foreign key (synthesis_id, observation_id) references public.research_observations (synthesis_id, id) on delete cascade
);

create index research_insight_evidence_observation_idx on public.research_insight_evidence (observation_id);
create index research_insight_evidence_synthesis_idx   on public.research_insight_evidence (synthesis_id);

create or replace function public.touch_synthesis()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.research_syntheses set updated_at = now()
  where id = coalesce(new.synthesis_id, old.synthesis_id);
  return coalesce(new, old);
end;
$$;

revoke all on function public.touch_synthesis() from public, anon, authenticated;

create trigger research_sources_touch after insert or update or delete on public.research_sources
  for each row execute function public.touch_synthesis();
create trigger research_observations_touch after insert or update or delete on public.research_observations
  for each row execute function public.touch_synthesis();
create trigger research_themes_touch after insert or update or delete on public.research_themes
  for each row execute function public.touch_synthesis();
create trigger affinity_cards_touch after update or delete on public.affinity_cards
  for each row execute function public.touch_synthesis();
create trigger research_insights_touch after insert or update or delete on public.research_insights
  for each row execute function public.touch_synthesis();
create trigger research_insight_evidence_touch after insert or delete on public.research_insight_evidence
  for each row execute function public.touch_synthesis();

------------------------------------------------------------------------------
-- Journey Mapper
------------------------------------------------------------------------------

create table public.journeys (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id   uuid not null references public.projects (id) on delete cascade,
  persona_id   uuid references public.personas (id) on delete set null,
  name         text not null check (char_length(btrim(name)) between 1 and 160),
  journey_type text not null default 'customer' check (journey_type in ('customer', 'user', 'service', 'employee')),
  scenario     text check (scenario is null or char_length(scenario) <= 2000),
  state        text not null default 'current' check (state in ('current', 'future')),
  status       text not null default 'draft' check (status in ('draft', 'completed')),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint journeys_completed_consistency check ((status = 'completed') = (completed_at is not null))
);

create index journeys_owner_updated_idx on public.journeys (owner_id, updated_at desc);
create index journeys_project_idx       on public.journeys (project_id);
create index journeys_persona_idx       on public.journeys (persona_id);

create trigger journeys_set_updated_at
  before update on public.journeys
  for each row execute function public.set_updated_at();

create table public.journey_stages (
  id           uuid primary key default gen_random_uuid(),
  journey_id   uuid not null references public.journeys (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 80),
  position     integer not null default 0 check (position >= 0),
  -- 1 very negative ... 5 very positive; null means "not rated", never "neutral".
  emotion      smallint check (emotion is null or emotion between 1 and 5),
  emotion_note text check (emotion_note is null or char_length(emotion_note) <= 300),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint journey_stages_journey_id_unique unique (journey_id, id)
);

create index journey_stages_journey_idx on public.journey_stages (journey_id, position);

create trigger journey_stages_set_updated_at
  before update on public.journey_stages
  for each row execute function public.set_updated_at();

create table public.journey_items (
  id             uuid primary key default gen_random_uuid(),
  journey_id     uuid not null,
  stage_id       uuid not null,
  kind           text not null
                   check (kind in ('action', 'goal', 'thought', 'touchpoint', 'channel', 'pain_point', 'opportunity', 'evidence')),
  content        text not null check (char_length(btrim(content)) between 1 and 1000),
  -- Where this came from: a note, and optionally an observation from a synthesis.
  evidence_note  text check (evidence_note is null or char_length(evidence_note) <= 500),
  observation_id uuid references public.research_observations (id) on delete set null,
  position       integer not null default 0 check (position >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint journey_items_stage_fk
    foreign key (journey_id, stage_id) references public.journey_stages (journey_id, id) on delete cascade
);

create index journey_items_stage_idx       on public.journey_items (stage_id, kind, position);
create index journey_items_journey_idx     on public.journey_items (journey_id);
create index journey_items_observation_idx on public.journey_items (observation_id);

create trigger journey_items_set_updated_at
  before update on public.journey_items
  for each row execute function public.set_updated_at();

-- Pain points and opportunities handed on for the Opportunity Analyzer. The stage and journey
-- names are copied so the origin is still readable if the stage is later renamed or removed.
create table public.opportunity_candidates (
  id             uuid primary key default gen_random_uuid(),
  owner_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id     uuid not null references public.projects (id) on delete cascade,
  journey_id     uuid references public.journeys (id) on delete set null,
  stage_id       uuid references public.journey_stages (id) on delete set null,
  source_item_id uuid unique references public.journey_items (id) on delete set null,
  observation_id uuid references public.research_observations (id) on delete set null,
  title          text not null check (char_length(btrim(title)) between 1 and 300),
  origin_kind    text not null check (origin_kind in ('pain_point', 'opportunity')),
  journey_name   text check (journey_name is null or char_length(journey_name) <= 160),
  stage_name     text check (stage_name is null or char_length(stage_name) <= 80),
  evidence_note  text check (evidence_note is null or char_length(evidence_note) <= 500),
  status         text not null default 'candidate' check (status in ('candidate')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index opportunity_candidates_owner_idx   on public.opportunity_candidates (owner_id, created_at desc);
create index opportunity_candidates_project_idx on public.opportunity_candidates (project_id);
create index opportunity_candidates_journey_idx on public.opportunity_candidates (journey_id);

create trigger opportunity_candidates_set_updated_at
  before update on public.opportunity_candidates
  for each row execute function public.set_updated_at();

create or replace function public.touch_journey()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.journeys set updated_at = now()
  where id = coalesce(new.journey_id, old.journey_id);
  return coalesce(new, old);
end;
$$;

revoke all on function public.touch_journey() from public, anon, authenticated;

create trigger journey_stages_touch after insert or update or delete on public.journey_stages
  for each row execute function public.touch_journey();
create trigger journey_items_touch after insert or update or delete on public.journey_items
  for each row execute function public.touch_journey();

------------------------------------------------------------------------------
-- Row Level Security: owner only, with parent ownership checked on every child row.
------------------------------------------------------------------------------

create or replace function public.is_synthesis_owner(p_synthesis_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.research_syntheses s
    where s.id = p_synthesis_id and s.owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_journey_owner(p_journey_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.journeys j
    where j.id = p_journey_id and j.owner_id = (select auth.uid())
  );
$$;

-- An observation the caller owns (through its synthesis), for links from journeys.
create or replace function public.is_observation_owner(p_observation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.research_observations o
    join public.research_syntheses s on s.id = o.synthesis_id
    where o.id = p_observation_id and s.owner_id = (select auth.uid())
  );
$$;

-- A persona the caller owns that belongs to the given project.
create or replace function public.is_project_persona(p_persona_id uuid, p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.personas p
    where p.id = p_persona_id and p.project_id = p_project_id and p.owner_id = (select auth.uid())
  );
$$;

revoke all on function public.is_synthesis_owner(uuid)           from public, anon;
revoke all on function public.is_journey_owner(uuid)             from public, anon;
revoke all on function public.is_observation_owner(uuid)         from public, anon;
revoke all on function public.is_project_persona(uuid, uuid)     from public, anon;
grant execute on function public.is_synthesis_owner(uuid)        to authenticated;
grant execute on function public.is_journey_owner(uuid)          to authenticated;
grant execute on function public.is_observation_owner(uuid)      to authenticated;
grant execute on function public.is_project_persona(uuid, uuid)  to authenticated;

revoke all on public.research_syntheses, public.research_sources, public.research_observations,
              public.research_themes, public.affinity_boards, public.affinity_cards,
              public.research_insights, public.research_insight_evidence,
              public.journeys, public.journey_stages, public.journey_items,
              public.opportunity_candidates from anon, authenticated;
grant select, insert, update, delete on public.research_syntheses, public.research_sources, public.research_observations,
              public.research_themes, public.affinity_boards, public.affinity_cards,
              public.research_insights, public.research_insight_evidence,
              public.journeys, public.journey_stages, public.journey_items,
              public.opportunity_candidates to authenticated;

alter table public.research_syntheses         enable row level security;
alter table public.research_sources           enable row level security;
alter table public.research_observations      enable row level security;
alter table public.research_themes            enable row level security;
alter table public.affinity_boards            enable row level security;
alter table public.affinity_cards             enable row level security;
alter table public.research_insights          enable row level security;
alter table public.research_insight_evidence  enable row level security;
alter table public.journeys                   enable row level security;
alter table public.journey_stages             enable row level security;
alter table public.journey_items              enable row level security;
alter table public.opportunity_candidates     enable row level security;

alter table public.research_syntheses         force row level security;
alter table public.research_sources           force row level security;
alter table public.research_observations      force row level security;
alter table public.research_themes            force row level security;
alter table public.affinity_boards            force row level security;
alter table public.affinity_cards             force row level security;
alter table public.research_insights          force row level security;
alter table public.research_insight_evidence  force row level security;
alter table public.journeys                   force row level security;
alter table public.journey_stages             force row level security;
alter table public.journey_items              force row level security;
alter table public.opportunity_candidates     force row level security;

-- Top-level records: owned by the caller and attached only to a project they own.
create policy research_syntheses_select on public.research_syntheses for select to authenticated
  using (owner_id = (select auth.uid()));
create policy research_syntheses_insert on public.research_syntheses for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));
create policy research_syntheses_update on public.research_syntheses for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()) and public.is_project_owner(project_id));
create policy research_syntheses_delete on public.research_syntheses for delete to authenticated
  using (owner_id = (select auth.uid()));

create policy journeys_select on public.journeys for select to authenticated
  using (owner_id = (select auth.uid()));
create policy journeys_insert on public.journeys for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.is_project_owner(project_id)
    and (persona_id is null or public.is_project_persona(persona_id, project_id))
  );
create policy journeys_update on public.journeys for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid()) and public.is_project_owner(project_id)
    and (persona_id is null or public.is_project_persona(persona_id, project_id))
  );
create policy journeys_delete on public.journeys for delete to authenticated
  using (owner_id = (select auth.uid()));

-- Synthesis children (every child row carries synthesis_id)
create policy research_sources_all on public.research_sources for all to authenticated
  using (public.is_synthesis_owner(synthesis_id)) with check (public.is_synthesis_owner(synthesis_id));
create policy research_observations_all on public.research_observations for all to authenticated
  using (public.is_synthesis_owner(synthesis_id)) with check (public.is_synthesis_owner(synthesis_id));
create policy research_themes_all on public.research_themes for all to authenticated
  using (public.is_synthesis_owner(synthesis_id)) with check (public.is_synthesis_owner(synthesis_id));
create policy affinity_boards_all on public.affinity_boards for all to authenticated
  using (public.is_synthesis_owner(synthesis_id)) with check (public.is_synthesis_owner(synthesis_id));
create policy affinity_cards_all on public.affinity_cards for all to authenticated
  using (public.is_synthesis_owner(synthesis_id)) with check (public.is_synthesis_owner(synthesis_id));
create policy research_insights_all on public.research_insights for all to authenticated
  using (public.is_synthesis_owner(synthesis_id)) with check (public.is_synthesis_owner(synthesis_id));
create policy research_insight_evidence_all on public.research_insight_evidence for all to authenticated
  using (public.is_synthesis_owner(synthesis_id)) with check (public.is_synthesis_owner(synthesis_id));

-- Journey children
create policy journey_stages_all on public.journey_stages for all to authenticated
  using (public.is_journey_owner(journey_id)) with check (public.is_journey_owner(journey_id));
-- A linked observation must be one the caller owns, so a journey can't point at someone else's notes.
create policy journey_items_all on public.journey_items for all to authenticated
  using (public.is_journey_owner(journey_id))
  with check (public.is_journey_owner(journey_id) and (observation_id is null or public.is_observation_owner(observation_id)));

create policy opportunity_candidates_select on public.opportunity_candidates for select to authenticated
  using (owner_id = (select auth.uid()));
create policy opportunity_candidates_insert on public.opportunity_candidates for insert to authenticated
  with check (
    owner_id = (select auth.uid()) and public.is_project_owner(project_id)
    and (journey_id is null or public.is_journey_owner(journey_id))
    and (observation_id is null or public.is_observation_owner(observation_id))
  );
create policy opportunity_candidates_update on public.opportunity_candidates for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid()) and public.is_project_owner(project_id)
    and (journey_id is null or public.is_journey_owner(journey_id))
    and (observation_id is null or public.is_observation_owner(observation_id))
  );
create policy opportunity_candidates_delete on public.opportunity_candidates for delete to authenticated
  using (owner_id = (select auth.uid()));

------------------------------------------------------------------------------
-- RPCs (SECURITY INVOKER: they run under the caller's RLS)
------------------------------------------------------------------------------

-- Saves the whole affinity layout in one transaction: themes (created, renamed, reordered,
-- removed) and where every card sits. Undo and redo are just earlier or later layouts.
create or replace function public.save_affinity_layout(p_synthesis_id uuid, p_themes jsonb, p_cards jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if jsonb_typeof(p_themes) is distinct from 'array' or jsonb_typeof(p_cards) is distinct from 'array' then
    raise exception 'Invalid layout' using errcode = '22023';
  end if;
  if jsonb_array_length(p_themes) > 200 or jsonb_array_length(p_cards) > 5000 then
    raise exception 'Layout too large' using errcode = '22023';
  end if;
  if not exists (select 1 from public.research_syntheses s where s.id = p_synthesis_id) then
    raise exception 'Synthesis not found' using errcode = 'P0002';
  end if;

  insert into public.research_themes (id, synthesis_id, title, notes, position)
  select (t ->> 'id')::uuid, p_synthesis_id, left(btrim(coalesce(t ->> 'title', '')), 120),
         nullif(left(coalesce(t ->> 'notes', ''), 2000), ''), coalesce((t ->> 'position')::int, 0)
  from jsonb_array_elements(p_themes) t
  on conflict (id) do update
    set title = excluded.title, notes = excluded.notes, position = excluded.position
    where public.research_themes.synthesis_id = p_synthesis_id;

  update public.affinity_cards c
  set theme_id = x.theme_id, position = x.position
  from (
    select (e ->> 'id')::uuid as id, nullif(e ->> 'theme_id', '')::uuid as theme_id,
           coalesce((e ->> 'position')::int, 0) as position
    from jsonb_array_elements(p_cards) e
  ) x
  where c.id = x.id and c.synthesis_id = p_synthesis_id;

  delete from public.research_themes th
  where th.synthesis_id = p_synthesis_id
    and th.id not in (select (t ->> 'id')::uuid from jsonb_array_elements(p_themes) t);
end;
$$;

create or replace function public.reorder_journey_stages(p_journey_id uuid, p_ids uuid[])
returns void
language sql
security invoker
set search_path = ''
as $$
  update public.journey_stages s
  set position = (k.ord - 1)::int * 10
  from unnest(p_ids) with ordinality as k(id, ord)
  where s.journey_id = p_journey_id and s.id = k.id;
$$;

-- Copies a journey with its stages and items. Used to branch a future-state map from a current one.
create or replace function public.duplicate_journey(p_journey_id uuid, p_state text default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  new_id uuid;
  new_stage uuid;
  s record;
begin
  insert into public.journeys (owner_id, project_id, persona_id, name, journey_type, scenario, state, status)
  select auth.uid(), j.project_id, j.persona_id, left(j.name, 150) || ' (copy)', j.journey_type, j.scenario,
         coalesce(p_state, j.state), 'draft'
  from public.journeys j
  where j.id = p_journey_id
  returning id into new_id;

  if new_id is null then
    raise exception 'Journey not found' using errcode = 'P0002';
  end if;

  for s in select * from public.journey_stages where journey_id = p_journey_id order by position loop
    insert into public.journey_stages (journey_id, name, position, emotion, emotion_note)
    values (new_id, s.name, s.position, s.emotion, s.emotion_note)
    returning id into new_stage;

    insert into public.journey_items (journey_id, stage_id, kind, content, evidence_note, observation_id, position)
    select new_id, new_stage, i.kind, i.content, i.evidence_note, i.observation_id, i.position
    from public.journey_items i
    where i.stage_id = s.id;
  end loop;

  return new_id;
end;
$$;

revoke all on function public.save_affinity_layout(uuid, jsonb, jsonb) from public, anon;
revoke all on function public.reorder_journey_stages(uuid, uuid[])     from public, anon;
revoke all on function public.duplicate_journey(uuid, text)            from public, anon;
grant execute on function public.save_affinity_layout(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.reorder_journey_stages(uuid, uuid[])     to authenticated;
grant execute on function public.duplicate_journey(uuid, text)            to authenticated;
