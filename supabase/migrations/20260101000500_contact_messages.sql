-- Messages from the public contact form. Anyone (signed in or not) may add a message; nobody can read,
-- change or delete them through the API. Read them in the Supabase dashboard.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254 and email like '%_@_%'),
  topic text not null check (topic in ('general', 'support', 'pro', 'feedback', 'partnership')),
  message text not null check (char_length(message) between 10 and 4000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

create policy "Anyone can send a contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

-- No select, update or delete policies: the table is write-only for API clients.
revoke all on public.contact_messages from anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;
