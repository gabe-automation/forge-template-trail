create policy "editors upload site media" on storage.objects for insert to authenticated
  with check (bucket_id = 'site-media' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and public.can_edit(((storage.foldername(name))[1])::uuid, auth.uid()));
create policy "members read site media" on storage.objects for select to authenticated
  using (bucket_id = 'site-media' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and public.is_member(((storage.foldername(name))[1])::uuid, auth.uid()));
create policy "editors delete site media" on storage.objects for delete to authenticated
  using (bucket_id = 'site-media' and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$' and public.can_edit(((storage.foldername(name))[1])::uuid, auth.uid()));