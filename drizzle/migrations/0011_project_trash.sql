ALTER TABLE public.projects ADD COLUMN deleted_at timestamptz;
CREATE FUNCTION public.guard_project_trash() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at AND (auth.uid() IS NULL OR OLD.owner_id <> auth.uid()) THEN RAISE EXCEPTION 'Only the project owner can move or restore a project'; END IF; RETURN NEW; END $$;
CREATE TRIGGER guard_project_trash BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.guard_project_trash();
GRANT SELECT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;