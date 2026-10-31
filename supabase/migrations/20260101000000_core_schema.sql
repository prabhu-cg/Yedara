-- Core schema: profiles, projects, project_members, project_settings.
-- Row Level Security is enabled in the next migration.

------------------------------------------------------------------------------
-- Shared helpers
------------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

------------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
------------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or char_length(full_name) <= 120),
  job_title   text check (job_title is null or char_length(job_title) <= 120),
  company     text check (company is null or char_length(company) <= 120),
  avatar_url  text check (avatar_url is null or char_length(avatar_url) <= 2048),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create a profile automatically for every new auth user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    nullif(left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

------------------------------------------------------------------------------
-- projects
------------------------------------------------------------------------------

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  description     text check (description is null or char_length(description) <= 2000),
  client          text check (client is null or char_length(client) <= 120),
  industry        text check (industry is null or char_length(industry) <= 80),
  project_type    text not null default 'other'
                    check (project_type ~ '^[a-z0-9_]{1,50}$'),
  status          text not null default 'planning'
                    check (status in ('planning', 'in_progress', 'review', 'completed', 'archived')),
  -- Status to restore when an archived project is un-archived.
  previous_status text
                    check (previous_status is null
                           or previous_status in ('planning', 'in_progress', 'review', 'completed')),
  archived_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint projects_archived_consistency
    check ((status = 'archived') = (archived_at is not null))
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);
create index projects_owner_created_idx on public.projects (owner_id, created_at desc);
create index projects_owner_status_idx  on public.projects (owner_id, status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- project_members (schema preparation only; no collaboration UI yet)
------------------------------------------------------------------------------

create table public.project_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null default 'viewer' check (role in ('editor', 'viewer')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint project_members_unique_member unique (project_id, user_id)
);

create index project_members_user_idx on public.project_members (user_id);

create trigger project_members_set_updated_at
  before update on public.project_members
  for each row execute function public.set_updated_at();

------------------------------------------------------------------------------
-- project_settings (1:1 with projects)
------------------------------------------------------------------------------

create table public.project_settings (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null unique references public.projects (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb
                check (jsonb_typeof(preferences) = 'object'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger project_settings_set_updated_at
  before update on public.project_settings
  for each row execute function public.set_updated_at();

-- Every project gets a settings row.
create or replace function public.handle_new_project()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_settings (project_id) values (new.id)
  on conflict (project_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_project() from public, anon, authenticated;

create trigger on_project_created
  after insert on public.projects
  for each row execute function public.handle_new_project();
