-- Chat messages and Yjs shared-text updates (created out-of-band in the original project).
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid default auth.uid(),
  body text not null,
  mentions uuid[] not null default '{}',
  activity_id bigint,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "members read messages" on public.messages for select to authenticated using (public.is_member(project_id, auth.uid()));
create policy "members send messages" on public.messages for insert to authenticated with check (public.is_member(project_id, auth.uid()));
create policy "authors delete own messages" on public.messages for delete to authenticated using (author_id = auth.uid() or public.project_role_of(project_id, auth.uid()) = 'owner');
alter table public.messages replica identity full;
alter publication supabase_realtime add table public.messages;

create table if not exists public.text_updates (
  id bigint generated always as identity primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  node_id uuid,
  update text not null,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.text_updates to authenticated;
grant all on public.text_updates to service_role;
alter table public.text_updates enable row level security;
create policy "members read text updates" on public.text_updates for select to authenticated using (public.is_member(project_id, auth.uid()));
create policy "editors write text updates" on public.text_updates for insert to authenticated with check (public.can_edit(project_id, auth.uid()));
create policy "editors compact text updates" on public.text_updates for delete to authenticated using (public.can_edit(project_id, auth.uid()));
alter publication supabase_realtime add table public.text_updates;

-- Activity entries gain node linkage and before/after snapshots (added out-of-band originally).
alter table public.activity add column if not exists node_id uuid;
alter table public.activity add column if not exists "before" jsonb;
alter table public.activity add column if not exists "after" jsonb;

alter table public.leases replica identity full;
create index if not exists text_updates_project_idx on public.text_updates(project_id, id);
create index if not exists messages_project_idx on public.messages(project_id, created_at);
