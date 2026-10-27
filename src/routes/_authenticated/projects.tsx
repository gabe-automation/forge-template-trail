import { SITE_TEMPLATES, templateViews, templatePageCount, type SiteTemplate } from "@/lib/siteTemplates";
import { SitePreview } from "@/components/SitePreview";
import { toView, type NodeView } from "@/lib/model";
import { DEFAULT_THEME, type Theme } from "@/lib/blocks";
import { val, type Props } from "@/lib/crdt";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspaceShell, TemplateGallery } from "@/components/WorkspaceGallery";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowUpRight, Check, Plus } from "lucide-react";
import { useDeviceAccess } from "@/hooks/use-device-access";

export const Route = createFileRoute("/_authenticated/projects")({
  head: () => ({
    meta: [
      { title: "Your projects — WebCraft" },
      { name: "description", content: "All the websites you and your team are building in WebCraft." },
      { property: "og:title", content: "Your projects — WebCraft" },
      { property: "og:description", content: "All the websites you and your team are building in WebCraft." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Projects,
});

function Projects() {
  const { readOnly } = useDeviceAccess();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("project_members")
        .select("role, projects(id, name, created_at)")
        .eq("user_id", u.user?.id ?? "");
      if (error) throw error;
      return (data ?? [])
        .flatMap((r) => r.projects ? [{ role: r.role, ...r.projects }] : [])
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

  const ids = (projects ?? []).map((p) => p.id);
  const { data: thumbs } = useQuery({
    queryKey: ["project-thumbs", ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const [n, pg, pr] = await Promise.all([
        supabase.from("nodes").select("id, project_id, props").in("project_id", ids),
        supabase.from("pages").select("id, project_id, kind, sort, created_at").in("project_id", ids).eq("kind", "canvas").order("sort").order("created_at"),
        supabase.from("projects").select("id, theme").in("id", ids),
      ]);
      const first: Record<string, string> = {};
      for (const p of pg.data ?? []) if (!first[p.project_id]) first[p.project_id] = p.id;
      const out: Record<string, { nodes: NodeView[]; theme: Theme }> = {};
      for (const p of pr.data ?? []) out[p.id] = { nodes: [], theme: { ...DEFAULT_THEME, ...(p.theme as Partial<Theme>) } };
      for (const row of n.data ?? []) {
        const props = row.props as unknown as Props;
        if (val<string>(props, "kind", "") === "wb") continue;
        const v = toView(row.id, props);
        if (!v || (v.page ?? first[row.project_id]) !== first[row.project_id]) continue;
        out[row.project_id]?.nodes.push(v);
      }
      return out;
    },
  });
  const [tpl, setTpl] = useState("");
  const [section, setSection] = useState("Projects");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const filtered = (projects ?? []).filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const featured = filtered[0];

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (readOnly || !name.trim() || busy) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("create_project", { _name: name });
    if (error || !data) {
      setBusy(false);
      toast.error("Couldn't create project");
      return;
    }
    setName("");
    if (tpl) sessionStorage.setItem(`webcraft:tpl:${data}`, tpl);
    qc.invalidateQueries({ queryKey: ["projects"] });
    navigate({ to: "/p/$projectId", params: { projectId: data } });
  }

  return <WorkspaceShell signedIn section={section} onSection={setSection} search={search} onSearch={setSearch}
    onSignOut={() => supabase.auth.signOut().then(() => navigate({ to: "/" }))}>
    <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
      <h1 className="text-3xl font-semibold">{section}</h1>
      {readOnly ? <span className="text-xs text-muted-foreground">View only</span> : <Button aria-label="New project" onClick={() => { setTpl(sessionStorage.getItem("webcraft:pending-template") ?? ""); sessionStorage.removeItem("webcraft:pending-template"); setCreating(true); }}><Plus className="size-4"/><span className="hidden sm:inline">New project</span></Button>}
    </div>
    {section === "Templates" ? <TemplateGallery readOnly={readOnly} search={search} onPick={(t) => { if (!readOnly) { setTpl(t.id); setCreating(true); } }}/>
      : <>
        {isLoading && <div className="h-80 animate-pulse bg-muted"/>}
        {featured && <Link to="/p/$projectId" params={{ projectId: featured.id }} className="group mb-10 grid overflow-hidden border bg-card transition hover:border-primary md:grid-cols-[3fr_2fr]">
          <SitePreview nodes={thumbs?.[featured.id]?.nodes ?? []} theme={thumbs?.[featured.id]?.theme ?? DEFAULT_THEME} height={340}/>
          <div className="flex min-w-0 flex-col justify-center gap-6 p-7 sm:p-9"><p className="text-xs font-semibold uppercase text-primary">Latest project</p><h2 className="break-words text-2xl font-semibold">{featured.name}</h2><div className="flex gap-8 text-xs text-muted-foreground"><div>Created<p className="mt-1 font-semibold text-foreground">{new Date(featured.created_at).toLocaleDateString()}</p></div><div>Your role<p className="mt-1 font-semibold capitalize text-foreground">{featured.role}</p></div></div><span className="flex items-center gap-2 text-sm font-semibold text-primary">Open project <ArrowUpRight className="size-4"/></span></div>
        </Link>}
        <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.slice(1).map((p) => <Link key={p.id} to="/p/$projectId" params={{ projectId: p.id }} className="group min-w-0"><div className="overflow-hidden rounded-lg border transition group-hover:border-primary"><SitePreview nodes={thumbs?.[p.id]?.nodes ?? []} theme={thumbs?.[p.id]?.theme ?? DEFAULT_THEME} height={230}/></div><h2 className="mt-4 truncate text-sm font-semibold">{p.name}</h2><p className="mt-1 text-xs capitalize text-muted-foreground">{p.role}</p></Link>)}
          {!readOnly && <Button variant="ghost" onClick={() => { setTpl(""); setCreating(true); }} className="h-[230px] flex-col gap-3 border border-dashed text-muted-foreground"><Plus className="size-7 text-primary"/>New blank project</Button>}
        </div>
        {!isLoading && filtered.length === 0 && <div className="mt-8"><h2 className="mb-6 text-xl font-semibold">Start from a template</h2><TemplateGallery readOnly={readOnly} search={search} onPick={(t) => { if (!readOnly) { setTpl(t.id); setCreating(true); } }}/></div>}
      </>}
    <Dialog open={creating && !readOnly} onOpenChange={setCreating}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Start a new project</DialogTitle>
          <DialogDescription>Pick a starting point — templates arrive as complete multi-page websites you can reshape block by block.</DialogDescription>
        </DialogHeader>
        {(() => {
          const blank = { id: "", name: "Blank canvas", description: "One empty page — start from scratch and drop blocks in as you go.", theme: DEFAULT_THEME };
          const selected = SITE_TEMPLATES.find((t) => t.id === tpl);
          const choices: (typeof blank | SiteTemplate)[] = [blank, ...SITE_TEMPLATES];
          return (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_230px]">
              <div className="grid content-start gap-3 sm:grid-cols-2">
                {choices.map((t) => {
                  const sel = tpl === t.id;
                  const isTpl = "blocks" in t && (t as SiteTemplate).blocks.length > 0;
                  const count = isTpl ? templatePageCount(t as SiteTemplate) : 1;
                  return (
                    <button key={t.id} type="button" aria-pressed={sel} onClick={() => setTpl(t.id)}
                      className={`group relative overflow-hidden rounded-xl border bg-card text-left transition hover:shadow-lift ${sel ? "border-primary ring-2 ring-primary/40" : "hover:border-primary/50"}`}>
                      {isTpl
                        ? <SitePreview nodes={templateViews(t as SiteTemplate)} theme={t.theme} height={140} className="w-full border-b" />
                        : <div className="grid h-[140px] place-items-center border-b bg-dotgrid text-xs text-muted-foreground">Empty page</div>}
                      <span className="relative block p-3">
                        <span className="flex items-center justify-between gap-2"><span className="block truncate text-sm font-medium">{t.name}</span><span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{count} page{count > 1 ? "s" : ""}</span></span>
                        <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-muted-foreground">{t.description}</span>
                        {sel && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground shadow"><Check className="size-3.5" /></span>}
                      </span>
                    </button>
                  );
                })}
              </div>
              <aside className="hidden flex-col gap-3 self-start rounded-xl border bg-muted/40 p-4 lg:flex">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your choice</p>
                <p className="text-sm font-medium">{selected?.name ?? "Blank canvas"}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{selected?.description ?? "Begin with an empty page and add blocks as you go."}</p>
                <p className="mt-auto rounded-lg bg-background p-3 text-xs leading-relaxed text-muted-foreground">
                  You'll land straight in the editor{selected ? <> with <strong className="text-foreground">{templatePageCount(selected)} page{templatePageCount(selected) > 1 ? "s" : ""}</strong> already set up</> : ""} — theme, fonts and photos included.
                </p>
              </aside>
            </div>
          );
        })()}
        <form onSubmit={create} className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t bg-card px-6 pb-1 pt-3 sm:flex-row">
          <Input aria-label="Project name" required autoFocus placeholder="Name your project — e.g. Studio redesign" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
          <Button type="submit" disabled={busy || !name.trim()} className="sm:w-44">{busy ? "Creating…" : "Create project"}</Button>
        </form>
      </DialogContent></Dialog>
  </WorkspaceShell>;
}
