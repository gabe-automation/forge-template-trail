create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null default 'canvas' check (kind in ('canvas','whiteboard','chat')),
  title text not null default 'Untitled',
  sort text not null default 'm',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.pages to authenticated;
grant all on public.pages to service_role;
alter table public.pages enable row level security;
create policy "members read pages" on public.pages for select to authenticated using (public.is_member(project_id, auth.uid()));
create policy "editors add pages" on public.pages for insert to authenticated with check (public.can_edit(project_id, auth.uid()));
create policy "editors update pages" on public.pages for update to authenticated using (public.can_edit(project_id, auth.uid()));
create policy "editors delete pages" on public.pages for delete to authenticated using (public.can_edit(project_id, auth.uid()));
alter table public.pages replica identity full;
alter publication supabase_realtime add table public.pages;
