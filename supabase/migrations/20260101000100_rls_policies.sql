-- Row Level Security. Access is denied by default; each policy below grants
-- the minimum needed. The frontend is never the security boundary.

------------------------------------------------------------------------------
-- Helper functions
--
-- SECURITY DEFINER so policies on one table can consult another table without
-- triggering that table's own policies (which would recurse infinitely).
-- search_path is pinned and EXECUTE is limited to signed-in users.
------------------------------------------------------------------------------

create or replace function public.is_project_owner(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = (select auth.uid())
  );
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project_id and m.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_project_owner(uuid)  from public, anon;
revoke all on function public.is_project_member(uuid) from public, anon;
grant execute on function public.is_project_owner(uuid)  to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;

------------------------------------------------------------------------------
-- Table privileges: anonymous users get nothing; signed-in users get only the
-- verbs the application needs (RLS then narrows these to their own rows).
------------------------------------------------------------------------------

revoke all on public.profiles         from anon, authenticated;
revoke all on public.projects         from anon, authenticated;
revoke all on public.project_members  from anon, authenticated;
revoke all on public.project_settings from anon, authenticated;

grant select, insert, update         on public.profiles         to authenticated;
grant select, insert, update, delete on public.projects         to authenticated;
grant select                         on public.project_members  to authenticated;
grant select, insert, update         on public.project_settings to authenticated;

------------------------------------------------------------------------------
-- profiles: a user can read and edit only their own profile.
------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

------------------------------------------------------------------------------
-- projects: owners have full control; members (future) can read.
------------------------------------------------------------------------------

alter table public.projects enable row level security;
alter table public.projects force row level security;

create policy projects_select on public.projects
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_project_member(id));

create policy projects_insert_own on public.projects
  for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- WITH CHECK stops an owner re-assigning a project to someone else.
create policy projects_update_own on public.projects
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy projects_delete_own on public.projects
  for delete to authenticated
  using (owner_id = (select auth.uid()));

------------------------------------------------------------------------------
-- project_members: read-only for now. No insert/update/delete policies exist,
-- so clients cannot write; the collaboration phase will add owner-managed
-- write policies.
------------------------------------------------------------------------------

alter table public.project_members enable row level security;
alter table public.project_members force row level security;

create policy project_members_select on public.project_members
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_project_owner(project_id));

------------------------------------------------------------------------------
-- project_settings: visible to owner and members; only the owner writes.
-- Rows are removed by ON DELETE CASCADE from projects.
------------------------------------------------------------------------------

alter table public.project_settings enable row level security;
alter table public.project_settings force row level security;

create policy project_settings_select on public.project_settings
  for select to authenticated
  using (public.is_project_owner(project_id) or public.is_project_member(project_id));

create policy project_settings_insert_owner on public.project_settings
  for insert to authenticated
  with check (public.is_project_owner(project_id));

create policy project_settings_update_owner on public.project_settings
  for update to authenticated
  using (public.is_project_owner(project_id))
  with check (public.is_project_owner(project_id));
