create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  body text not null,
  mentions uuid[] not null default '{}',
  activity_id bigint,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.chat_messages to authenticated;
grant all on public.chat_messages to service_role;
alter table public.chat_messages enable row level security;
create policy "members read chat messages" on public.chat_messages for select to authenticated using (public.is_member(project_id, auth.uid()));
create policy "members send chat messages" on public.chat_messages for insert to authenticated with check (public.is_member(project_id, auth.uid()));
create policy "authors delete own chat messages" on public.chat_messages for delete to authenticated using (user_id = auth.uid() or public.project_role_of(project_id, auth.uid()) = 'owner');
alter table public.chat_messages replica identity full;
alter publication supabase_realtime add table public.chat_messages;
create index if not exists chat_messages_project_idx on public.chat_messages(project_id, created_at);
comment on table public.messages is 'DEPRECATED: replaced by chat_messages';
